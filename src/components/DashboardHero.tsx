
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Calendar, BarChart3, PieChart, Zap } from 'lucide-react';

interface DashboardHeroProps {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  onNavigate: (view: string) => void;
}

const DashboardHero = ({ totalIncome, totalExpenses, netBalance, onNavigate }: DashboardHeroProps) => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-2xl text-white animate-fade-in">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-scale-in">
            💰 Your Financial Dashboard
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Track, analyze, and master your household finances with ease
          </p>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card className="bg-white/10 backdrop-blur border-white/20 hover-scale">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-300" />
                <div className="text-2xl font-bold text-green-300">
                  ${totalIncome.toFixed(2)}
                </div>
                <div className="text-sm opacity-90">Total Income</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur border-white/20 hover-scale">
              <CardContent className="p-6 text-center">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-300" />
                <div className="text-2xl font-bold text-red-300">
                  ${totalExpenses.toFixed(2)}
                </div>
                <div className="text-sm opacity-90">Total Expenses</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur border-white/20 hover-scale">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-300" />
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ${netBalance.toFixed(2)}
                </div>
                <div className="text-sm opacity-90">Net Balance</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover-scale bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 group"
          onClick={() => onNavigate('daily')}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-green-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">My Daily Expenses</h3>
              <p className="text-green-600 dark:text-green-400">Track your day-to-day spending patterns</p>
              <Button variant="outline" className="mt-4 border-green-500 text-green-700 hover:bg-green-500 hover:text-white">
                View Daily Tracker
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-scale bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 group"
          onClick={() => onNavigate('weekly')}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-blue-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">My Weekly Review</h3>
              <p className="text-blue-600 dark:text-blue-400">Analyze your weekly financial trends</p>
              <Button variant="outline" className="mt-4 border-blue-500 text-blue-700 hover:bg-blue-500 hover:text-white">
                View Weekly Tracker
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-scale bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 group"
          onClick={() => onNavigate('monthly')}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-purple-500 rounded-full group-hover:scale-110 transition-transform duration-300">
                <PieChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300">My Monthly Overview</h3>
              <p className="text-purple-600 dark:text-purple-400">Get comprehensive monthly insights</p>
              <Button variant="outline" className="mt-4 border-purple-500 text-purple-700 hover:bg-purple-500 hover:text-white">
                View Monthly Tracker
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-6 w-6 text-orange-500" />
              <span className="text-lg font-semibold text-orange-700 dark:text-orange-300">Quick Insight</span>
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">
              {netBalance >= 0 ? '🎉 You\'re in the green!' : '⚠️ Watch your spending'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHero;
