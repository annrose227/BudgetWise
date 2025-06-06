
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
}

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface ComparisonResult {
  matched: Array<{ userTransaction: Transaction; bankTransaction: BankTransaction }>;
  userOnly: Transaction[];
  bankOnly: BankTransaction[];
  mismatched: Array<{ userTransaction: Transaction; bankTransaction: BankTransaction; reason: string }>;
}

interface BankComparisonProps {
  transactions: Transaction[];
}

const BankComparison = ({ transactions }: BankComparisonProps) => {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setBankTransactions(parsed);
      
      toast({
        title: "File uploaded successfully",
        description: `Parsed ${parsed.length} bank transactions.`,
      });
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseCSV = (text: string): BankTransaction[] => {
    const lines = text.trim().split('\n');
    const header = lines[0].toLowerCase();
    
    // Try to detect column positions based on common headers
    const headers = header.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const descIndex = headers.findIndex(h => h.includes('description') || h.includes('memo') || h.includes('detail'));
    const amountIndex = headers.findIndex(h => h.includes('amount'));
    const typeIndex = headers.findIndex(h => h.includes('type') || h.includes('transaction'));

    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      throw new Error('Required columns not found');
    }

    return lines.slice(1).map(line => {
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      const amount = Math.abs(parseFloat(columns[amountIndex]));
      let type: 'debit' | 'credit' = 'debit';
      
      // Determine transaction type
      if (typeIndex !== -1) {
        const typeValue = columns[typeIndex].toLowerCase();
        type = typeValue.includes('credit') || typeValue.includes('deposit') ? 'credit' : 'debit';
      } else {
        // If no type column, assume negative amounts are debits, positive are credits
        const originalAmount = parseFloat(columns[amountIndex]);
        type = originalAmount > 0 ? 'credit' : 'debit';
      }

      return {
        date: formatDate(columns[dateIndex]),
        description: columns[descIndex],
        amount,
        type
      };
    }).filter(t => !isNaN(t.amount));
  };

  const formatDate = (dateStr: string): string => {
    // Try to parse various date formats and convert to YYYY-MM-DD
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try MM/DD/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    return date.toISOString().split('T')[0];
  };

  const compareTransactions = () => {
    if (bankTransactions.length === 0) {
      toast({
        title: "No bank data",
        description: "Please upload a bank statement first.",
        variant: "destructive",
      });
      return;
    }

    const result: ComparisonResult = {
      matched: [],
      userOnly: [...transactions],
      bankOnly: [...bankTransactions],
      mismatched: []
    };

    // Compare transactions
    transactions.forEach(userTx => {
      const matchingBankTx = bankTransactions.find(bankTx => {
        const amountMatch = Math.abs(userTx.amount - bankTx.amount) < 0.01;
        const dateMatch = userTx.date === bankTx.date;
        const typeMatch = (userTx.type === 'income' && bankTx.type === 'credit') ||
                         (userTx.type === 'expense' && bankTx.type === 'debit');
        
        return amountMatch && dateMatch && typeMatch;
      });

      if (matchingBankTx) {
        result.matched.push({ userTransaction: userTx, bankTransaction: matchingBankTx });
        result.userOnly = result.userOnly.filter(t => t.id !== userTx.id);
        result.bankOnly = result.bankOnly.filter(t => t !== matchingBankTx);
      } else {
        // Check for potential mismatches (same date, different amount or type)
        const potentialMismatch = bankTransactions.find(bankTx => {
          return userTx.date === bankTx.date && 
                 (Math.abs(userTx.amount - bankTx.amount) >= 0.01 || 
                  !((userTx.type === 'income' && bankTx.type === 'credit') ||
                    (userTx.type === 'expense' && bankTx.type === 'debit')));
        });

        if (potentialMismatch) {
          let reason = '';
          if (Math.abs(userTx.amount - potentialMismatch.amount) >= 0.01) {
            reason = 'Amount mismatch';
          } else {
            reason = 'Transaction type mismatch';
          }
          
          result.mismatched.push({ 
            userTransaction: userTx, 
            bankTransaction: potentialMismatch, 
            reason 
          });
          result.userOnly = result.userOnly.filter(t => t.id !== userTx.id);
          result.bankOnly = result.bankOnly.filter(t => t !== potentialMismatch);
        }
      }
    });

    setComparisonResult(result);

    toast({
      title: "Comparison complete",
      description: `Found ${result.matched.length} matches, ${result.userOnly.length + result.bankOnly.length} unmatched, and ${result.mismatched.length} mismatched transactions.`,
    });
  };

  const generateReport = () => {
    if (!comparisonResult) return;

    const report = {
      summary: {
        totalMatched: comparisonResult.matched.length,
        totalUnmatched: comparisonResult.userOnly.length + comparisonResult.bankOnly.length,
        totalMismatched: comparisonResult.mismatched.length,
        date: new Date().toISOString().split('T')[0]
      },
      details: comparisonResult
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-comparison-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report downloaded",
      description: "Your comparison report has been saved.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Bank Statement Upload</span>
          </CardTitle>
          <CardDescription>
            Upload your bank statement in CSV format to compare with your recorded transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</p>
            <p className="text-sm text-gray-500 mb-4">
              Your CSV should include columns for Date, Description, Amount, and Type
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Processing...' : 'Choose CSV File'}
            </Button>
          </div>

          {bankTransactions.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully loaded {bankTransactions.length} bank transactions. Ready for comparison.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={compareTransactions}
              disabled={bankTransactions.length === 0 || transactions.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Compare Transactions
            </Button>
            
            {comparisonResult && (
              <Button
                onClick={generateReport}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonResult.matched.length}
                  </div>
                  <div className="text-sm text-green-700">Matched</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {comparisonResult.userOnly.length}
                  </div>
                  <div className="text-sm text-yellow-700">Missing from Bank</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.bankOnly.length}
                  </div>
                  <div className="text-sm text-blue-700">Missing from Records</div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {comparisonResult.mismatched.length}
                  </div>
                  <div className="text-sm text-red-700">Mismatched</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mismatched Transactions */}
          {comparisonResult.mismatched.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>Mismatched Transactions</span>
                </CardTitle>
                <CardDescription>
                  Transactions that exist in both records but have different details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparisonResult.mismatched.map((mismatch, index) => (
                    <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="destructive">{mismatch.reason}</Badge>
                        <span className="text-sm text-gray-500">{mismatch.userTransaction.date}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Your Record</h5>
                          <p className="text-sm text-gray-600">{mismatch.userTransaction.description}</p>
                          <p className="text-sm font-medium">
                            ${mismatch.userTransaction.amount.toFixed(2)} ({mismatch.userTransaction.type})
                          </p>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Bank Record</h5>
                          <p className="text-sm text-gray-600">{mismatch.bankTransaction.description}</p>
                          <p className="text-sm font-medium">
                            ${mismatch.bankTransaction.amount.toFixed(2)} ({mismatch.bankTransaction.type})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unmatched Transactions */}
          {(comparisonResult.userOnly.length > 0 || comparisonResult.bankOnly.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Missing from Bank */}
              {comparisonResult.userOnly.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-yellow-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Missing from Bank ({comparisonResult.userOnly.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparisonResult.userOnly.map(transaction => (
                        <div key={transaction.id} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-600">{transaction.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{transaction.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Missing from Records */}
              {comparisonResult.bankOnly.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-600">
                      <FileText className="h-5 w-5" />
                      <span>Missing from Records ({comparisonResult.bankOnly.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparisonResult.bankOnly.map((transaction, index) => (
                        <div key={index} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-gray-600">{transaction.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{transaction.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BankComparison;
