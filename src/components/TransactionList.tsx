import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  description: string;
}

interface Transaction {
  _id: string; // Use _id for MongoDB
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense"; // Assuming type is still needed for display logic
  description: string;
}

interface TransactionListProps {
  onEdit: (transaction: Transaction) => void;
  showActions?: boolean;
  refreshTrigger: number; // Add a prop to trigger refresh
}

const TransactionList = ({
  onEdit,
  showActions = true,
  refreshTrigger,
}: TransactionListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view transactions.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/expenses", {
          headers: {
            "x-auth-token": token,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Assuming the backend returns an array of expense objects
          // We need to map backend expense (no type) to frontend transaction (with type)
          // For now, we'll assume all fetched items are expenses.
          // A more robust solution would involve the backend returning the type or inferring it.
          const formattedTransactions: Transaction[] = data.map((exp: any) => ({
            ...exp,
            id: exp._id, // Map _id to id for existing component logic
            type: "expense", // Default to expense for now
          }));
          setTransactions(formattedTransactions);
        } else {
          const data = await response.json();
          setError(data.msg || "Failed to fetch transactions.");
        }
      } catch (err) {
        console.error("Fetch transactions error:", err);
        setError("An error occurred while fetching transactions.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [refreshTrigger]); // Depend on refreshTrigger to refetch

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to delete transactions.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/expenses/${id}`,
          {
            method: "DELETE",
            headers: {
              "x-auth-token": token,
            },
          }
        );

        if (response.ok) {
          // Remove the deleted transaction from the state
          setTransactions(
            transactions.filter((transaction) => transaction._id !== id)
          );
        } else {
          const data = await response.json();
          console.error("Transaction delete failed:", data.msg);
          alert(data.msg || "Failed to delete transaction.");
        }
      } catch (error) {
        console.error("Transaction delete error:", error);
        alert("An error occurred while deleting the transaction.");
      }
    }
  };

  // Get unique categories for filter from fetched transactions
  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesCategory =
      filterCategory === "all" || transaction.category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Sort by date (newest first)
  const sortedTransactions = filteredTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, type: string) => {
    const formatted = `₹${amount.toFixed(2)}`;
    return type === "income" ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Transactions</span>
        </CardTitle>
        <CardDescription>
          Manage and review your financial transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : sortedTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
              <p className="text-sm">
                Try adjusting your filters or add a new transaction
              </p>
            </div>
          ) : (
            sortedTransactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income"
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {transaction.description || "No description"}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(transaction.date)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatAmount(transaction.amount, transaction.type)}
                    </div>
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(transaction._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionList;
