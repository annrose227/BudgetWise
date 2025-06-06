
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useState } from 'react';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
}

interface FinancialChartsProps {
  transactions: Transaction[];
  period?: 'daily' | 'weekly' | 'monthly';
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

const FinancialCharts = ({ transactions, period }: FinancialChartsProps) => {
  const [chartType, setChartType] = useState('pie');
  const [dataType, setDataType] = useState('expense');

  // Filter transactions based on period
  const getFilteredTransactions = () => {
    if (!period) return transactions;

    const now = new Date();
    const filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      
      switch (period) {
        case 'daily':
          return transactionDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transactionDate >= weekAgo;
        case 'monthly':
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Prepare data for category breakdown
  const categoryData = filteredTransactions
    .filter(t => t.type === dataType)
    .reduce((acc, transaction) => {
      const category = transaction.category;
      acc[category] = (acc[category] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  // Prepare data for trends based on period
  const getTrendData = () => {
    if (!period) {
      // Monthly trends for overview
      const monthlyData = filteredTransactions.reduce((acc, transaction) => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = { period: monthKey, income: 0, expense: 0 };
        }
        
        acc[monthKey][transaction.type] += transaction.amount;
        return acc;
      }, {} as Record<string, { period: string; income: number; expense: number }>);

      return Object.values(monthlyData)
        .sort((a, b) => a.period.localeCompare(b.period))
        .map(item => ({
          ...item,
          period: new Date(item.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        }));
    }

    if (period === 'daily') {
      // Show last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      return last7Days.map(dateStr => {
        const dayTransactions = filteredTransactions.filter(t => t.date === dateStr);
        const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
          period: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
          income,
          expense
        };
      });
    }

    if (period === 'weekly') {
      // Show last 4 weeks
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * 7));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        return { start: startDate, end: endDate, label: `Week ${4 - i}` };
      });

      return weeks.map(week => {
        const weekTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= week.start && tDate <= week.end;
        });
        
        const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        return {
          period: week.label,
          income,
          expense
        };
      });
    }

    // Monthly - show current month by weeks
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weeks = [];
    let currentWeekStart = new Date(firstDayOfMonth);
    
    while (currentWeekStart.getMonth() === now.getMonth()) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd.getMonth() > now.getMonth()) {
        weekEnd.setDate(0); // Last day of current month
      }
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(weekEnd),
        label: `Week ${weeks.length + 1}`
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks.map(week => {
      const weekTransactions = filteredTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= week.start && tDate <= week.end;
      });
      
      const income = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      return {
        period: week.label,
        income,
        expense
      };
    });
  };

  const trendData = getTrendData();

  const barData = Object.entries(categoryData).map(([name, value]) => ({
    name: name.length > 10 ? name.substring(0, 10) + '...' : name,
    fullName: name,
    value,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.fullName || label}</p>
          <p className="text-blue-600 dark:text-blue-400">
            Amount: <span className="font-semibold">${payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const periodTitle = period ? `${period.charAt(0).toUpperCase() + period.slice(1)} ` : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category Breakdown Chart */}
      <Card className="hover-scale">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center space-x-2">
                {chartType === 'pie' ? (
                  <PieChartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
                <span>{periodTitle}Category Breakdown</span>
              </CardTitle>
              <CardDescription>
                {periodTitle}spending analysis by category
              </CardDescription>
            </div>
            
            <div className="flex space-x-2">
              <Select value={dataType} onValueChange={setDataType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p>No data available</p>
                <p className="text-sm">Add some {dataType} transactions to see the breakdown</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <Card className="hover-scale">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>{periodTitle}Trends</span>
          </CardTitle>
          <CardDescription>
            {periodTitle}income vs expenses over time
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p>No trend data available</p>
                <p className="text-sm">Add transactions to see trends</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ fill: '#EF4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialCharts;
