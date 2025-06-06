import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Moon,
  Sun,
  Calendar as CalendarIcon,
  BarChart3,
  PieChart,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import FinancialCharts from "@/components/FinancialCharts";
import BankComparison from "@/components/BankComparison";
import AuthModal from "@/components/AuthModal";
import ExpenseCalendar from "@/components/ExpenseCalendar";
import DashboardHero from "@/components/DashboardHero";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  description: string;
}

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state
  const { toast } = useToast();

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    const theme = localStorage.getItem("theme");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      // No need to load transactions here anymore, TransactionList fetches its own
    }
    if (theme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    localStorage.setItem("isAuthenticated", "true");
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh after login
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token"); // Also remove the token on logout
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh after logout (to clear list)
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
  };

  // Modify these handlers to trigger refresh instead of managing local state
  const handleTransactionSubmit = () => {
    setShowTransactionForm(false);
    setEditingTransaction(null);
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh after add/edit
    toast({
      title: "Transaction saved",
      description: "Your transaction has been saved successfully.",
    });
  };

  const handleTransactionDelete = () => {
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh after delete
    toast({
      title: "Transaction deleted",
      description: "Your transaction has been removed.",
    });
  };

  // We'll keep calculateSummary for now, but it will need to fetch data
  // or be updated to work with the data from TransactionList if needed elsewhere.
  // For now, it's not directly used in the authenticated view's main render.
  const calculateSummary = () => {
    // This function might need to be refactored or removed if summary is calculated on backend
    return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
  };

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url('https://www.idfcfirstbank.com/content/dam/idfcfirstbank/images/blog/finance/difference-between-money-finance-funds-717X404.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-md w-full space-y-8 text-center animate-fade-in bg-white bg-opacity-90 p-8 rounded-lg shadow-lg">
          {" "}
          {/* Added background and padding for readability */}
          <div>
            <DollarSign className="mx-auto h-16 w-16 text-blue-600 dark:text-blue-400 animate-pulse" />
            <h1 className="mt-6 text-4xl font-bold text-gray-900 dark:text-white">
              Household Finance Tracker
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Track your income, expenses, and compare with bank statements
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 hover-scale"
              size="lg"
            >
              Get Started
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Secure authentication • Data privacy protected
            </p>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  // Recalculate summary or fetch from backend if needed in authenticated view
  // const { totalIncome, totalExpenses, netBalance } = calculateSummary();

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "dark" : ""
      }`}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Finance Tracker
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4 text-gray-500" />
                  <Switch checked={darkMode} onCheckedChange={toggleTheme} />
                  <Moon className="h-4 w-4 text-gray-500" />
                </div>
                <Button
                  onClick={() => setShowTransactionForm(true)}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 hover-scale"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeView === "overview" && (
            <DashboardHero
              totalIncome={0} // These will need to be fetched or calculated differently
              totalExpenses={0} // These will need to be fetched or calculated differently
              netBalance={0} // These will need to be fetched or calculated differently
              onNavigate={setActiveView}
            />
          )}

          {activeView !== "overview" && (
            <div className="mb-6">
              <Button
                onClick={() => setActiveView("overview")}
                variant="outline"
                className="hover-scale"
              >
                ← Back to Overview
              </Button>
            </div>
          )}

          {/* Main Content */}
          {activeView === "overview" && (
            <div className="mt-8">
              <Tabs defaultValue="analytics" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-800">
                  <TabsTrigger value="analytics" className="hover-scale">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="hover-scale">
                    All Transactions
                  </TabsTrigger>
                  <TabsTrigger value="bank-comparison" className="hover-scale">
                    Bank Comparison
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics">
                  {/* FinancialCharts will also need to fetch data */}
                  <FinancialCharts transactions={[]} />
                </TabsContent>

                <TabsContent value="transactions">
                  <TransactionList
                    onEdit={setEditingTransaction}
                    showActions={true}
                    refreshTrigger={refreshTrigger} // Pass refresh trigger
                  />
                </TabsContent>

                <TabsContent value="bank-comparison">
                  {/* BankComparison will also need to fetch data */}
                  <BankComparison transactions={[]} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {(activeView === "daily" ||
            activeView === "weekly" ||
            activeView === "monthly") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* FinancialCharts will also need to fetch data */}
                <FinancialCharts transactions={[]} period={activeView} />
              </div>
              <div>
                {/* ExpenseCalendar will also need to fetch data */}
                <ExpenseCalendar
                  transactions={[]}
                  period={activeView}
                  budget={1000} // Default budget, can be made configurable
                />
              </div>
            </div>
          )}
        </main>

        {/* Transaction Form Modal */}
        {showTransactionForm && (
          <TransactionForm
            onSubmit={handleTransactionSubmit} // Use the new handler
            onClose={() => setShowTransactionForm(false)}
          />
        )}

        {/* Edit Transaction Modal */}
        {editingTransaction && (
          <TransactionForm
            transaction={editingTransaction}
            onSubmit={handleTransactionSubmit} // Use the new handler
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
