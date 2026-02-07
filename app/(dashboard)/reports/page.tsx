import { requireAuth } from '@/lib/auth-simple';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils-finance';
import { TrendingUp, TrendingDown, Leaf, AlertTriangle, Repeat, LineChart, Download, Receipt } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ReportActions } from '@/components/reports/report-actions';

function pctChange(current: number, previous: number) {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return Number.isFinite(change) ? change : null;
}

function trendBadge(value: number | null) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <Badge variant={positive ? 'outline' : 'destructive'} className="text-[11px]">
      {positive ? '+' : ''}{value.toFixed(1)}%
    </Badge>
  );
}

const PERIODS = [
  { key: 'month', label: 'Mês atual' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: 'year', label: 'Ano corrente' },
];

function getPeriodRange(period: string | undefined) {
  const now = new Date();
  if (period === '90d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { start, end: now, windowDays: 90, label: 'Últimos 90 dias' };
  }
  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: now, windowDays: 365, label: 'Ano corrente' };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now, windowDays: 90, label: 'Mês atual' };
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ period?: string; account_id?: string; category?: string }> }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/auth/login');
  }

  const resolvedSearch = await searchParams;
  const period = (resolvedSearch?.period as string | undefined) || 'month';
  const accountFilter = resolvedSearch?.account_id ? String(resolvedSearch.account_id) : '';
  const categoryFilter = resolvedSearch?.category ? String(resolvedSearch.category) : '';

  const isUuid = (value: string) => /^[0-9a-fA-F-]{32,36}$/.test(value);
  const accountParam = accountFilter && isUuid(accountFilter) ? accountFilter : null;
  const categoryParam = categoryFilter && isUuid(categoryFilter) ? categoryFilter : null;
  const { start: periodStart, end: periodEnd, windowDays, label: periodLabel } = getPeriodRange(period);

  const prevStart = new Date(periodStart);
  const prevEnd = new Date(periodStart);
  const spanMs = periodEnd.getTime() - periodStart.getTime();
  prevStart.setTime(prevStart.getTime() - spanMs);
  prevEnd.setTime(periodStart.getTime());

  const [currentSummary] = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as expense
    FROM transactions
    WHERE user_id = ${user.id}
      AND transaction_date >= ${periodStart} AND transaction_date < ${periodEnd}
      AND (${accountParam}::uuid IS NULL OR account_id = ${accountParam}::uuid)
      AND (${categoryParam}::uuid IS NULL OR category_id = ${categoryParam}::uuid)
  `;

  const [previousSummary] = await sql`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as expense
    FROM transactions
    WHERE user_id = ${user.id}
      AND transaction_date >= ${prevStart}
      AND transaction_date < ${prevEnd}
      AND (${accountParam}::uuid IS NULL OR account_id = ${accountParam}::uuid)
      AND (${categoryParam}::uuid IS NULL OR category_id = ${categoryParam}::uuid)
  `;

  const topCategories = await sql`
    SELECT COALESCE(c.name, 'Sem categoria') as category, SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${user.id} AND t.type = 'expense'
      AND t.transaction_date >= ${periodStart} AND t.transaction_date < ${periodEnd}
      AND (${accountParam}::uuid IS NULL OR t.account_id = ${accountParam}::uuid)
      AND (${categoryParam}::uuid IS NULL OR t.category_id = ${categoryParam}::uuid)
    GROUP BY c.id, c.name
    ORDER BY total DESC
    LIMIT 6
  `;

  const recurring = await sql`
    SELECT description, COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE user_id = ${user.id} AND type = 'expense' AND transaction_date >= ${periodStart}
      AND (${accountParam}::uuid IS NULL OR account_id = ${accountParam}::uuid)
      AND (${categoryParam}::uuid IS NULL OR category_id = ${categoryParam}::uuid)
    GROUP BY description
    HAVING COUNT(*) >= 3
    ORDER BY total DESC
    LIMIT 5
  `;

  const weekly = await sql`
    SELECT
      date_trunc('week', transaction_date)::date as week,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ${user.id} AND transaction_date >= ${periodStart}
      AND (${accountParam}::uuid IS NULL OR account_id = ${accountParam}::uuid)
      AND (${categoryParam}::uuid IS NULL OR category_id = ${categoryParam}::uuid)
    GROUP BY 1
    ORDER BY week DESC
    LIMIT 12
  `;

  const accounts = await sql`
    SELECT id, name FROM accounts WHERE user_id = ${user.id} ORDER BY name
  `;

  const categories = await sql`
    SELECT id, name FROM categories WHERE user_id = ${user.id} ORDER BY name
  `;

  const income = Number(currentSummary?.income || 0);
  const expense = Number(currentSummary?.expense || 0);
  const net = income - expense;

  const prevIncome = Number(previousSummary?.income || 0);
  const prevExpense = Number(previousSummary?.expense || 0);
  const incomeDelta = pctChange(income, prevIncome);
  const expenseDelta = pctChange(expense, prevExpense);
  const savingRate = income > 0 ? (net / income) * 100 : 0;

  const maxWeeklyAbs = Math.max(
    ...weekly.map((w: any) => Math.max(Number(w.income || 0), Number(w.expense || 0), Math.abs(Number(w.income || 0) - Number(w.expense || 0)))),
    1
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Relatórios</p>
            <Badge variant="outline" className="gap-2 text-[12px]">
              <LineChart className="h-4 w-4" /> {periodLabel}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">Visão executiva</h1>
          <p className="text-muted-foreground">Resumo claro de saúde financeira, gasto por categoria e recorrências.</p>
        </div>
        <ReportActions period={period} accountId={accountFilter} category={categoryFilter} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {PERIODS.map((p) => (
          <Link key={p.key} href={`/reports?period=${p.key}`}>
            <Badge variant={p.key === period ? 'default' : 'outline'} className={cn('cursor-pointer', p.key === period ? 'shadow-sm' : '')}>
              {p.label}
            </Badge>
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end mb-6">
        <input type="hidden" name="period" value={period} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Conta</label>
          <select name="account_id" defaultValue={accountFilter} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todas</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={String(acc.id)}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <select name="category" defaultValue={categoryFilter} className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-45">
            <option value="">Todas</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={String(cat.id)}>{cat.name || 'Sem categoria'}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="default" size="sm" className="h-10">Aplicar filtros</Button>
        {(accountFilter || categoryFilter) && (
          <Link href={`/reports?period=${period}`} className="text-sm text-muted-foreground underline">
            Limpar
          </Link>
        )}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Saldo líquido (mês)</p>
            {net >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>
          <p className="text-3xl font-semibold">{formatCurrency(net)}</p>
          <p className="text-xs text-muted-foreground">Receita {formatCurrency(income)} · Despesa {formatCurrency(expense)}</p>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Receita (mês)</p>
            {trendBadge(incomeDelta)}
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(income)}</p>
          <p className="text-xs text-muted-foreground">vs mês anterior {formatCurrency(prevIncome)}</p>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Despesas (mês)</p>
            {trendBadge(expenseDelta)}
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(expense)}</p>
          <p className="text-xs text-muted-foreground">vs mês anterior {formatCurrency(prevExpense)}</p>
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Taxa de poupança</p>
            {savingRate >= 20 ? <Leaf className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
          </div>
          <p className="text-2xl font-semibold">{savingRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Meta saudável: 20%+</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Gasto por categoria (mês)</p>
              <h3 className="text-lg font-semibold">Top 6 categorias</h3>
            </div>
            <Badge variant="secondary">Despesas</Badge>
          </div>
          <div className="space-y-3">
            {topCategories.map((cat: any) => {
              const total = Number(cat.total || 0);
              const pct = expense > 0 ? Math.min(100, (total / expense) * 100) : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{cat.category}</span>
                    <span className="text-muted-foreground">{formatCurrency(total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-2 bg-primary/80" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados de despesas neste mês.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Recorrências fortes</p>
              <h3 className="text-lg font-semibold">Gastos repetidos</h3>
            </div>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {recurring.map((item: any) => (
              <div key={item.description} className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground line-clamp-1">{item.description}</span>
                  <span className="text-xs text-muted-foreground">{item.count} lançamentos</span>
                </div>
                <span className="text-foreground">{formatCurrency(Number(item.total || 0))}</span>
              </div>
            ))}
            {recurring.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum gasto recorrente forte identificado.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Fluxo semanal (90d)</p>
              <h3 className="text-lg font-semibold">Entradas vs saídas</h3>
            </div>
            <Badge variant="outline" className="text-[11px]">8 semanas</Badge>
          </div>
          <div className="space-y-3">
            {weekly.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
            )}
            {weekly.slice().reverse().map((w: any) => {
              const inc = Number(w.income || 0);
              const exp = Number(w.expense || 0);
              const netWeek = inc - exp;
              const incWidth = Math.min(100, (inc / maxWeeklyAbs) * 100);
              const expWidth = Math.min(100, (exp / maxWeeklyAbs) * 100);
              const label = new Date(w.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              return (
                <div key={w.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span className={netWeek >= 0 ? 'text-emerald-600' : 'text-destructive'}>{formatCurrency(netWeek)}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="h-2 rounded-full bg-emerald-100" style={{ width: `${incWidth}%` }} />
                    <div className="h-2 rounded-full bg-destructive/60" style={{ width: `${expWidth}%` }} />
                  </div>
                </div>
              );
            })}
            {weekly.length > 0 && (
              <div className="pt-3 max-h-64 overflow-y-auto pr-1">
                <div className="grid grid-cols-4 text-xs text-muted-foreground mb-1">
                  <span>Semana</span>
                  <span className="text-right">Entrada</span>
                  <span className="text-right">Saída</span>
                  <span className="text-right">Líquido</span>
                </div>
                <div className="space-y-1 text-sm">
                  {weekly.map((w: any) => {
                    const inc = Number(w.income || 0);
                    const exp = Number(w.expense || 0);
                    const netWeek = inc - exp;
                    return (
                      <div key={w.week} className="grid grid-cols-4">
                        <span className="text-muted-foreground text-xs">
                          {new Date(w.week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-right text-emerald-600">{formatCurrency(inc)}</span>
                        <span className="text-right text-destructive">{formatCurrency(exp)}</span>
                        <span className={`text-right ${netWeek >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(netWeek)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Alertas rápidos</p>
              <h3 className="text-lg font-semibold">Riscos e destaques</h3>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-3 text-sm">
            {net < 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Saldo negativo no mês</p>
                  <p className="text-muted-foreground">Considere reduzir despesas nas principais categorias.</p>
                </div>
              </div>
            )}
            {savingRate < 20 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <Leaf className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Poupança abaixo da meta</p>
                  <p className="text-muted-foreground">Taxa atual {savingRate.toFixed(1)}%. Busque 20%+ de retenção.</p>
                </div>
              </div>
            )}
            {topCategories.slice(0, 1).map((cat: any) => (
              <div key={cat.category} className="flex items-start gap-2 rounded-md border border-muted/60 bg-muted/40 p-3">
                <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Maior categoria</p>
                  <p className="text-muted-foreground">{cat.category} — {formatCurrency(Number(cat.total || 0))}</p>
                </div>
              </div>
            ))}
            {recurring.slice(0, 1).map((item: any) => (
              <div key={item.description} className="flex items-start gap-2 rounded-md border border-muted/60 bg-muted/40 p-3">
                <Repeat className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Recorrência relevante</p>
                  <p className="text-muted-foreground">{item.description} — {formatCurrency(Number(item.total || 0))}</p>
                </div>
              </div>
            ))}
            {net >= 0 && savingRate >= 20 && topCategories.length === 0 && recurring.length === 0 && (
              <p className="text-muted-foreground">Tudo sob controle por enquanto.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
