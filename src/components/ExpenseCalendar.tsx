
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  description: string;
}

interface ExpenseCalendarProps {
  transactions: Transaction[];
  period: 'daily' | 'weekly' | 'monthly';
  budget: number;
}

const ExpenseCalendar = ({ transactions, period, budget }: ExpenseCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Calculate daily expenses
  const getDailyExpenses = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return transactions
      .filter(t => t.type === 'expense' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Determine if a day is over budget
  const isDayOverBudget = (date: Date) => {
    const dailyBudget = period === 'daily' ? budget : budget / 30; // Rough daily budget
    const expenses = getDailyExpenses(date);
    return expenses > dailyBudget;
  };

  // Get expenses for selected date
  const getSelectedDateExpenses = () => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return transactions.filter(t => t.date === dateStr);
  };

  const selectedExpenses = getSelectedDateExpenses();
  const selectedDayTotal = selectedExpenses
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Expense Calendar</span>
        </CardTitle>
        <CardDescription>
          Track your {period} spending patterns. Green = within budget, Red = over budget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{
            overBudget: (date) => isDayOverBudget(date),
            hasExpenses: (date) => getDailyExpenses(date) > 0,
          }}
          modifiersStyles={{
            overBudget: {
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              fontWeight: 'bold',
            },
            hasExpenses: {
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontWeight: 'bold',
            },
          }}
        />

        {/* Legend */}
        <div className="flex justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>Within Budget</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span>Over Budget</span>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="space-y-3 animate-scale-in">
            <h4 className="font-semibold">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            
            <div className="flex items-center justify-between">
              <span>Total Expenses:</span>
              <Badge variant={selectedDayTotal > budget / 30 ? "destructive" : "secondary"}>
                ${selectedDayTotal.toFixed(2)}
              </Badge>
            </div>

            {selectedExpenses.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedExpenses.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center space-x-2">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="truncate">{transaction.description}</span>
                    </div>
                    <span className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No transactions for this date</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseCalendar;
