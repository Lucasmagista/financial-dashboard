import { 
  getTransactionsByUserId,
  getCategoryBreakdown,
  getIncomeVsExpenses,
  getTotalBalance
} from '@/lib/db';
import { Card } from '@/components/ui/card';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown';
import { formatCurrency, getStartOfMonth, getEndOfMonth } from '@/lib/utils-finance';
import Link from 'next/link';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { requireAuth } from '@/lib/auth-simple';
import { redirect } from 'next/navigation';

export default async function AnalyticsPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/auth/login');
  }
  
  const userId = user.id;
  
  const [incomeExpenses, expenseCategories, incomeCategories, totalBalance, transactions] = await Promise.all([
    getIncomeVsExpenses(userId, 12),
    getCategoryBreakdown(userId, 'expense'),
    getCategoryBreakdown(userId, 'income'),
    getTotalBalance(userId),
    getTransactionsByUserId(userId, 1000)
  ]);

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Monthly averages
  const monthlyAvgIncome = incomeExpenses.length > 0 
    ? incomeExpenses.reduce((sum, m) => sum + Number(m.income), 0) / incomeExpenses.length 
    : 0;
  
  const monthlyAvgExpenses = incomeExpenses.length > 0 
    ? incomeExpenses.reduce((sum, m) => sum + Number(m.expenses), 0) / incomeExpenses.length 
    : 0;

  // Top spending categories
  const topExpenseCategories = expenseCategories.slice(0, 5);

  // Calculate trends
  const recentMonths = incomeExpenses.slice(-2);
  const incomeTrend = recentMonths.length === 2 
    ? ((Number(recentMonths[1].income) - Number(recentMonths[0].income)) / Number(recentMonths[0].income)) * 100
    : 0;
  
  const expenseTrend = recentMonths.length === 2 
    ? ((Number(recentMonths[1].expenses) - Number(recentMonths[0].expenses)) / Number(recentMonths[0].expenses)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Análises Financeiras</h1>
          <p className="text-muted-foreground mt-1">
            Insights detalhados sobre suas finanças
          </p>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            {incomeTrend !== 0 && (
              <p className={`text-xs mt-1 ${incomeTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {incomeTrend > 0 ? '+' : ''}{incomeTrend.toFixed(1)}% vs mês anterior
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Despesa Total</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            {expenseTrend !== 0 && (
              <p className={`text-xs mt-1 ${expenseTrend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {expenseTrend > 0 ? '+' : ''}{expenseTrend.toFixed(1)}% vs mês anterior
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Poupança</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{savingsRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalIncome - totalExpenses)} economizado
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Transações</p>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total registrado
            </p>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <IncomeExpenseChart data={incomeExpenses} />
          <CategoryBreakdown data={expenseCategories} title="Despesas por Categoria" />
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Médias Mensais</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Receita Média</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(monthlyAvgIncome)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Despesa Média</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(monthlyAvgExpenses)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600"
                    style={{ 
                      width: monthlyAvgIncome > 0 
                        ? `${(monthlyAvgExpenses / monthlyAvgIncome) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Poupança Média</span>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency(monthlyAvgIncome - monthlyAvgExpenses)}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ 
                      width: monthlyAvgIncome > 0 
                        ? `${((monthlyAvgIncome - monthlyAvgExpenses) / monthlyAvgIncome) * 100}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 Categorias de Gastos</h3>
            <div className="space-y-3">
              {topExpenseCategories.map((category: any, index) => {
                const percentage = (Number(category.total) / totalExpenses) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.name || 'Sem Categoria'}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(Number(category.total))}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color || 'hsl(var(--primary))'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Income Categories */}
        {incomeCategories.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBreakdown data={incomeCategories} title="Receitas por Categoria" />
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Insights Financeiros</h3>
              <div className="space-y-4">
                {savingsRate >= 20 && (
                  <div className="p-4 rounded-lg bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Excelente Taxa de Poupança! 🎉
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Você está economizando {savingsRate.toFixed(1)}% da sua receita. Continue assim!
                    </p>
                  </div>
                )}
                
                {savingsRate < 10 && savingsRate > 0 && (
                  <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Taxa de Poupança Baixa
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Você está economizando apenas {savingsRate.toFixed(1)}%. Considere revisar seus gastos.
                    </p>
                  </div>
                )}
                
                {totalExpenses > totalIncome && (
                  <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Atenção: Despesas Maiores que Receitas
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Suas despesas estão {formatCurrency(totalExpenses - totalIncome)} acima da receita.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg bg-muted border">
                  <p className="text-sm font-medium">Dica do Dia</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revise seus gastos recorrentes mensalmente para identificar oportunidades de economia.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
