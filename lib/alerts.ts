import { sql } from '@vercel/postgres';
import {
  getBudgetsByUserId,
  getTransactionsByDateRange,
  getIncomeVsExpenses,
} from './db';
import { logger } from './logger';

export interface Alert {
  id: string;
  type: 'budget' | 'unusual' | 'goal' | 'recurring' | 'balance';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: Date;
}

export async function checkAlerts(userId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // 1. Budget Alerts
    const budgets = await getBudgetsByUserId(userId);
    for (const budget of budgets) {
      const spent = Number(budget.spent || 0);
      const amount = Number(budget.amount);
      const percentage = (spent / amount) * 100;

      if (percentage >= 100) {
        alerts.push({
          id: `budget-${budget.id}-exceeded`,
          type: 'budget',
          severity: 'high',
          title: 'Orçamento Ultrapassado',
          message: `Você ultrapassou o orçamento de ${budget.category_name || budget.name} em ${(percentage - 100).toFixed(0)}%`,
          actionUrl: '/analytics',
          createdAt: new Date(),
        });
      } else if (percentage >= (budget.alert_threshold || 80)) {
        alerts.push({
          id: `budget-${budget.id}-warning`,
          type: 'budget',
          severity: 'medium',
          title: 'Alerta de Orçamento',
          message: `Você atingiu ${percentage.toFixed(0)}% do orçamento de ${budget.category_name || budget.name}`,
          actionUrl: '/analytics',
          createdAt: new Date(),
        });
      }
    }

    // 2. Unusual Spending Alert
    const last30Days = await getTransactionsByDateRange(
      userId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTransactions = last30Days.filter(
      (t) =>
        new Date(t.transaction_date) >= todayStart && t.type === 'expense'
    );

    const todayTotal = todayTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const avgDaily =
      last30Days
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) / 30;

    if (todayTotal > avgDaily * 2) {
      alerts.push({
        id: 'unusual-spending-today',
        type: 'unusual',
        severity: 'medium',
        title: 'Gastos Acima da Média',
        message: `Seus gastos hoje (${formatCurrency(todayTotal)}) estão ${((todayTotal / avgDaily) * 100).toFixed(0)}% acima da média diária`,
        actionUrl: '/transactions',
        createdAt: new Date(),
      });
    }

    // 3. Goal Progress Alerts
    const goalsResult = await sql`
      SELECT * FROM goals 
      WHERE user_id = ${userId} 
        AND is_completed = false
        AND target_date IS NOT NULL
        AND target_date <= NOW() + INTERVAL '7 days'
      ORDER BY target_date ASC
    `;

    for (const goal of goalsResult.rows) {
      const progress =
        (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
      const daysLeft = Math.ceil(
        (new Date(goal.target_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysLeft <= 7 && progress < 90) {
        alerts.push({
          id: `goal-${goal.id}-deadline`,
          type: 'goal',
          severity: 'medium',
          title: 'Meta Próxima do Prazo',
          message: `Faltam ${daysLeft} dias para a meta "${goal.name}" e você está em ${progress.toFixed(0)}%`,
          actionUrl: '/',
          createdAt: new Date(),
        });
      }
    }

    // 4. Negative Balance Alert
    const accountsResult = await sql`
      SELECT * FROM accounts 
      WHERE user_id = ${userId} 
        AND is_active = true
        AND balance < 0
        AND account_type != 'credit_card'
    `;

    for (const account of accountsResult.rows) {
      alerts.push({
        id: `account-${account.id}-negative`,
        type: 'balance',
        severity: 'high',
        title: 'Saldo Negativo',
        message: `A conta ${account.name} está com saldo negativo: ${formatCurrency(account.balance)}`,
        actionUrl: '/',
        createdAt: new Date(),
      });
    }

    // 5. Recurring Transaction Reminder
    const upcomingRecurring = await sql`
      SELECT DISTINCT ON (description) 
        t.*,
        c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
        AND t.is_recurring = true
        AND t.transaction_date <= NOW() - INTERVAL '25 days'
        AND t.transaction_date >= NOW() - INTERVAL '35 days'
      ORDER BY description, transaction_date DESC
    `;

    for (const transaction of upcomingRecurring.rows) {
      alerts.push({
        id: `recurring-${transaction.id}`,
        type: 'recurring',
        severity: 'low',
        title: 'Transação Recorrente',
        message: `Lembrete: ${transaction.description} (${formatCurrency(transaction.amount)}) deve ocorrer em breve`,
        actionUrl: '/transactions',
        createdAt: new Date(),
      });
    }
  } catch (error) {
    logger.error('Error checking alerts', error, { userId });
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}
