import { 
  getAccountsByUserId, 
  getTransactionsByUserId,
  getTotalBalance,
  getIncomeVsExpenses,
  getCategoryBreakdown,
  getBudgetsByUserId,
  getGoalsByUserId
} from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { StatCard } from '@/components/dashboard/stat-card';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { AccountsOverview } from '@/components/dashboard/accounts-overview';
import { BudgetsOverview } from '@/components/dashboard/budgets-overview';
import { GoalsOverview } from '@/components/dashboard/goals-overview';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { PredictionsCard } from '@/components/dashboard/predictions-card';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/utils-finance';
import { checkAlerts } from '@/lib/alerts';
import { predictNextMonthExpenses } from '@/lib/predictions';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // Get authenticated user
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/auth/login');
  }
  
  const userId = user.id;
  
  // Fetch all data with error handling
  const [
    accounts, 
    transactions, 
    totalBalance, 
    incomeExpenses, 
    categoryData, 
    budgets, 
    goals, 
    alerts, 
    prediction
  ] = await Promise.allSettled([
    getAccountsByUserId(userId),
    getTransactionsByUserId(userId, 10),
    getTotalBalance(userId),
    getIncomeVsExpenses(userId, 6),
    getCategoryBreakdown(userId, 'expense'),
    getBudgetsByUserId(userId),
    getGoalsByUserId(userId),
    checkAlerts(userId),
    predictNextMonthExpenses(userId)
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

  // Calculate stats
  const totalAssets = Number(totalBalance?.total_assets) || 0;
  const totalLiabilities = Number(totalBalance?.total_liabilities) || 0;
  const netWorth = totalAssets - totalLiabilities;

  // Calculate this month's income and expenses
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthData = incomeExpenses?.find?.(item => item.month === currentMonth);
  const thisMonthIncome = Number(thisMonthData?.income) || 0;
  const thisMonthExpenses = Number(thisMonthData?.expenses) || 0;
  const monthBalance = thisMonthIncome - thisMonthExpenses;
  
  console.log('[v0] Dashboard stats:', {
    totalAssets,
    totalLiabilities,
    netWorth,
    currentMonth,
    thisMonthIncome,
    thisMonthExpenses,
    monthBalance,
    activeAccounts: accounts.filter(a => a.is_active).length
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
              <p className="text-muted-foreground mt-1">
                Bem-vindo ao seu painel de controle financeiro
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Patrimônio Líquido</p>
              <p className="text-2xl font-bold">{formatCurrency(netWorth)}</p>
            </div>
          </div>
        </div>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total em Contas"
            value={formatCurrency(totalAssets)}
            icon={Wallet}
            description={`${accounts.filter(a => a.is_active).length} conta(s) ativa(s)`}
          />
          <StatCard
            title="Receitas (Mês)"
            value={formatCurrency(thisMonthIncome)}
            icon={TrendingUp}
            description="Total recebido neste mês"
          />
          <StatCard
            title="Despesas (Mês)"
            value={formatCurrency(thisMonthExpenses)}
            icon={TrendingDown}
            description="Total gasto neste mês"
          />
          <StatCard
            title="Saldo do Mês"
            value={formatCurrency(monthBalance)}
            icon={PiggyBank}
            trend={{
              value: thisMonthExpenses > 0 ? Math.round((thisMonthIncome / thisMonthExpenses - 1) * 100) : 0,
              isPositive: monthBalance >= 0
            }}
          />
        </div>

        {/* Alerts and Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AlertsPanel alerts={alerts} />
          <PredictionsCard prediction={prediction} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <IncomeExpenseChart data={incomeExpenses} />
          <CategoryBreakdown data={categoryData} />
        </div>

        {/* Accounts and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AccountsOverview accounts={accounts} />
          <RecentTransactions transactions={transactions} />
        </div>

        {/* Budgets and Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetsOverview budgets={budgets} />
          <GoalsOverview goals={goals} />
        </div>
      </main>
    </div>
  );
}
