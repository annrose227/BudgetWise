import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  description: string;
}

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

interface ComparisonResult {
  matched: Array<{
    userTransaction: Transaction;
    bankTransaction: BankTransaction;
  }>;
  userOnly: Transaction[];
  bankOnly: BankTransaction[];
  mismatched: Array<{
    userTransaction: Transaction;
    bankTransaction: BankTransaction;
    reason: string;
  }>;
}

interface BankComparisonProps {
  transactions: Transaction[];
}

const BankComparison = ({ transactions }: BankComparisonProps) => {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(
    []
  );
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
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
    const lines = text.trim().split("\n");
    if (lines.length === 0) return [];

    const headerLine = lines[0];
    let delimiter = ",";
    if (headerLine.includes(";")) {
      delimiter = ";";
    } else if (headerLine.includes("\t")) {
      delimiter = "\t";
    }

    const header = lines[0].toLowerCase();

    // Use a simple split for now, assuming no complex quoted fields with delimiters inside
    const headers = header
      .split(delimiter)
      .map((h) => h.trim().replace(/"/g, ""));

    const dateIndex = headers.findIndex(
      (h) => h.includes("date") || h.includes("datum")
    );
    const descIndex = headers.findIndex(
      (h) =>
        h.includes("description") ||
        h.includes("memo") ||
        h.includes("detail") ||
        h.includes("beschreibung")
    );
    const amountIndex = headers.findIndex(
      (h) => h.includes("amount") || h.includes("betrag")
    );
    const typeIndex = headers.findIndex(
      (h) =>
        h.includes("type") || h.includes("transaction") || h.includes("art")
    );
    // Add more header variations if needed

    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      throw new Error("Required columns (Date, Description, Amount) not found");
    }

    return lines
      .slice(1)
      .map((line) => {
        const columns = line
          .split(delimiter)
          .map((col) => col.trim().replace(/"/g, ""));

        // Skip lines that don't have enough columns or are empty
        if (
          columns.length <=
            Math.max(
              dateIndex,
              descIndex,
              amountIndex,
              typeIndex !== -1 ? typeIndex : 0
            ) ||
          line.trim() === ""
        ) {
          return null;
        }

        let amount = parseFloat(columns[amountIndex].replace(",", ".")); // Handle comma as decimal separator
        let type: "debit" | "credit" = "debit";

        // Determine transaction type
        if (typeIndex !== -1) {
          const typeValue = columns[typeIndex].toLowerCase();
          type =
            typeValue.includes("credit") ||
            typeValue.includes("deposit") ||
            typeValue.includes("haben")
              ? "credit"
              : "debit";
        } else {
          // If no type column, assume negative amounts are debits, positive are credits
          const originalAmount = parseFloat(
            columns[amountIndex].replace(",", ".")
          );
          type = originalAmount > 0 ? "credit" : "debit";
          amount = Math.abs(originalAmount);
        }

        const formattedDate = formatDate(columns[dateIndex]);
        if (formattedDate === "Invalid Date") {
          console.warn(
            `Skipping row due to invalid date format: ${columns[dateIndex]}`
          );
          return null; // Skip rows with invalid dates
        }

        return {
          date: formattedDate,
          description: columns[descIndex],
          amount,
          type,
        };
      })
      .filter((t): t is BankTransaction => t !== null && !isNaN(t.amount)); // Filter out nulls and NaNs
  };

  const formatDate = (dateStr: string): string => {
    // Try parsing with Date constructor first (handles many standard formats like YYYY-MM-DD, MM/DD/YYYY)
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }

    // Try specific common formats if Date constructor fails

    // DD.MM.YYYY
    let parts = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (parts) {
      const [, day, month, year] = parts;
      date = new Date(
        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      );
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    }

    // DD-MM-YYYY
    parts = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (parts) {
      const [, day, month, year] = parts;
      date = new Date(
        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      );
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    }

    // If all parsing fails
    return "Invalid Date";
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
      mismatched: [],
    };

    // Compare transactions
    transactions.forEach((userTx) => {
      const matchingBankTx = bankTransactions.find((bankTx) => {
        const amountMatch = Math.abs(userTx.amount - bankTx.amount) < 0.01;
        const dateMatch = userTx.date === bankTx.date;
        const typeMatch =
          (userTx.type === "income" && bankTx.type === "credit") ||
          (userTx.type === "expense" && bankTx.type === "debit");

        return amountMatch && dateMatch && typeMatch;
      });

      if (matchingBankTx) {
        result.matched.push({
          userTransaction: userTx,
          bankTransaction: matchingBankTx,
        });
        result.userOnly = result.userOnly.filter((t) => t.id !== userTx.id);
        result.bankOnly = result.bankOnly.filter((t) => t !== matchingBankTx);
      } else {
        // Check for potential mismatches (same date, different amount or type)
        const potentialMismatch = bankTransactions.find((bankTx) => {
          return (
            userTx.date === bankTx.date &&
            (Math.abs(userTx.amount - bankTx.amount) >= 0.01 ||
              !(
                (userTx.type === "income" && bankTx.type === "credit") ||
                (userTx.type === "expense" && bankTx.type === "debit")
              ))
          );
        });

        if (potentialMismatch) {
          let reason = "";
          if (Math.abs(userTx.amount - potentialMismatch.amount) >= 0.01) {
            reason = "Amount mismatch";
          } else {
            reason = "Transaction type mismatch";
          }

          result.mismatched.push({
            userTransaction: userTx,
            bankTransaction: potentialMismatch,
            reason,
          });
          result.userOnly = result.userOnly.filter((t) => t.id !== userTx.id);
          result.bankOnly = result.bankOnly.filter(
            (t) => t !== potentialMismatch
          );
        }
      }
    });

    setComparisonResult(result);

    toast({
      title: "Comparison complete",
      description: `Found ${result.matched.length} matches, ${
        result.userOnly.length + result.bankOnly.length
      } unmatched, and ${result.mismatched.length} mismatched transactions.`,
    });

    if (result.mismatched.length > 0) {
      toast({
        title: "Mismatches found",
        description: `${result.mismatched.length} transactions have mismatches. Please review the Mismatched Transactions section.`,
        variant: "destructive", // Use a destructive variant for alerts
      });
    }
  };

  const generateReport = () => {
    if (!comparisonResult) return;

    let csvContent = "Comparison Report\n\n";

    // Summary
    csvContent += "Summary\n";
    csvContent += `"Metric","Count"\n`;
    csvContent += `"Matched",${comparisonResult.matched.length}\n`;
    csvContent += `"Missing from Bank",${comparisonResult.userOnly.length}\n`;
    csvContent += `"Missing from Records",${comparisonResult.bankOnly.length}\n`;
    csvContent += `"Mismatched",${comparisonResult.mismatched.length}\n`;
    csvContent += `\n`;

    // Mismatched Transactions
    if (comparisonResult.mismatched.length > 0) {
      csvContent += "Mismatched Transactions\n";
      csvContent += `"Reason","Date","Your Description","Your Category","Your Amount","Your Type","Bank Description","Bank Amount","Bank Type"\n`;
      comparisonResult.mismatched.forEach((mismatch) => {
        csvContent += `"${mismatch.reason}","${
          mismatch.userTransaction.date
        }","${mismatch.userTransaction.description}","${
          mismatch.userTransaction.category
        }","${mismatch.userTransaction.amount.toFixed(2)}","${
          mismatch.userTransaction.type
        }","${
          mismatch.bankTransaction.description
        }","${mismatch.bankTransaction.amount.toFixed(2)}","${
          mismatch.bankTransaction.type
        }"\n`;
      });
      csvContent += `\n`;
    }

    // Unmatched Transactions (User Only)
    if (comparisonResult.userOnly.length > 0) {
      csvContent += "Missing from Bank (Your Records Only)\n";
      csvContent += `"Date","Description","Category","Amount","Type"\n`;
      comparisonResult.userOnly.forEach((transaction) => {
        csvContent += `"${transaction.date}","${transaction.description}","${
          transaction.category
        }","${transaction.amount.toFixed(2)}","${transaction.type}"\n`;
      });
      csvContent += `\n`;
    }

    // Unmatched Transactions (Bank Only)
    if (comparisonResult.bankOnly.length > 0) {
      csvContent += "Missing from Records (Bank Records Only)\n";
      csvContent += `"Date","Description","Amount","Type"\n`;
      comparisonResult.bankOnly.forEach((transaction) => {
        csvContent += `"${transaction.date}","${
          transaction.description
        }","${transaction.amount.toFixed(2)}","${transaction.type}"\n`;
      });
      csvContent += `\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bank-comparison-report-${
      new Date().toISOString().split("T")[0]
    }.csv`; // Change file extension to .csv
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report downloaded",
      description: "Your comparison report has been saved as a CSV file.",
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
            Upload your bank statement in CSV format to compare with your
            recorded transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload CSV File
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Your CSV should include columns for Date, Description, Amount, and
              Type
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
              {isLoading ? "Processing..." : "Choose CSV File"}
            </Button>
          </div>

          {bankTransactions.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully loaded {bankTransactions.length} bank transactions.
                Ready for comparison.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={compareTransactions}
              disabled={
                bankTransactions.length === 0 || transactions.length === 0
              }
              className="bg-green-600 hover:bg-green-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Compare Transactions
            </Button>

            {comparisonResult && (
              <Button onClick={generateReport} variant="outline">
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
              <CardDescription>
                Overview of the comparison results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {comparisonResult.matched.length}
                  </div>
                  <div className="text-sm text-green-700">Matched</div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {comparisonResult.userOnly.length}
                  </div>
                  <div className="text-sm text-yellow-700">
                    Missing from Bank
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonResult.bankOnly.length}
                  </div>
                  <div className="text-sm text-blue-700">
                    Missing from Records
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600 mb-2" />
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
                  Transactions that exist in both records but have different
                  details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparisonResult.mismatched.map((mismatch, index) => (
                    <div
                      key={index}
                      className="border border-red-200 rounded-lg p-4 bg-red-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="destructive">{mismatch.reason}</Badge>
                        <span className="text-sm text-gray-500">
                          Date: {mismatch.userTransaction.date}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">
                            Your Record
                          </h5>
                          <p>
                            <span className="font-semibold">Description:</span>{" "}
                            {mismatch.userTransaction.description}
                          </p>
                          <p>
                            <span className="font-semibold">Category:</span>{" "}
                            {mismatch.userTransaction.category}
                          </p>
                          <p>
                            <span className="font-semibold">Amount:</span> $
                            {mismatch.userTransaction.amount.toFixed(2)}
                          </p>
                          <p>
                            <span className="font-semibold">Type:</span>{" "}
                            {mismatch.userTransaction.type}
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">
                            Bank Record
                          </h5>
                          <p>
                            <span className="font-semibold">Description:</span>{" "}
                            {mismatch.bankTransaction.description}
                          </p>
                          <p>
                            <span className="font-semibold">Amount:</span> $
                            {mismatch.bankTransaction.amount.toFixed(2)}
                          </p>
                          <p>
                            <span className="font-semibold">Type:</span>{" "}
                            {mismatch.bankTransaction.type}
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
          {(comparisonResult.userOnly.length > 0 ||
            comparisonResult.bankOnly.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Missing from Bank */}
              {comparisonResult.userOnly.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-yellow-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>
                        Missing from Bank ({comparisonResult.userOnly.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparisonResult.userOnly.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 text-sm"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium">Your Record</p>
                            <span className="text-gray-500">
                              Date: {transaction.date}
                            </span>
                          </div>
                          <p>
                            <span className="font-semibold">Description:</span>{" "}
                            {transaction.description}
                          </p>
                          <p>
                            <span className="font-semibold">Category:</span>{" "}
                            {transaction.category}
                          </p>
                          <p>
                            <span className="font-semibold">Amount:</span> $
                            {transaction.amount.toFixed(2)}
                          </p>
                          <p>
                            <span className="font-semibold">Type:</span>{" "}
                            {transaction.type}
                          </p>
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
                      <span>
                        Missing from Records ({comparisonResult.bankOnly.length}
                        )
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparisonResult.bankOnly.map((transaction, index) => (
                        <div
                          key={index}
                          className="border border-blue-200 rounded-lg p-3 bg-blue-50 text-sm"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium">Bank Record</p>
                            <span className="text-gray-500">
                              Date: {transaction.date}
                            </span>
                          </div>
                          <p>
                            <span className="font-semibold">Description:</span>{" "}
                            {transaction.description}
                          </p>
                          <p>
                            <span className="font-semibold">Amount:</span> $
                            {transaction.amount.toFixed(2)}
                          </p>
                          <p>
                            <span className="font-semibold">Type:</span>{" "}
                            {transaction.type}
                          </p>
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
