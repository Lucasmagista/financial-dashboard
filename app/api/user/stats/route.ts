import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-simple';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

// GET /api/user/stats - Get user statistics
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive user statistics
    const [accountsResult, transactionsResult, categoriesResult, budgetsResult, goalsResult] = await Promise.all([
      sql`
        SELECT 
          COUNT(*) as total_accounts,
          SUM(CASE WHEN account_type IN ('checking', 'savings', 'investment') THEN balance ELSE 0 END) as total_assets,
          SUM(CASE WHEN account_type = 'credit_card' THEN ABS(balance) ELSE 0 END) as total_liabilities
        FROM accounts
        WHERE user_id = ${user.id} AND is_active = true
      `,
      sql`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
          MAX(transaction_date) as last_transaction_date,
          MIN(transaction_date) as first_transaction_date
        FROM transactions
        WHERE user_id = ${user.id}
      `,
      sql`
        SELECT COUNT(*) as total_categories
        FROM categories
        WHERE user_id = ${user.id}
      `,
      sql`
        SELECT 
          COUNT(*) as total_budgets,
          COUNT(CASE WHEN end_date >= NOW() OR end_date IS NULL THEN 1 END) as active_budgets
        FROM budgets
        WHERE user_id = ${user.id}
      `,
      sql`
        SELECT 
          COUNT(*) as total_goals,
          COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_goals,
          SUM(target_amount) as total_target_amount,
          SUM(current_amount) as total_saved_amount
        FROM goals
        WHERE user_id = ${user.id}
      `
    ]);

    const accounts = accountsResult[0];
    const transactions = transactionsResult[0];
    const categories = categoriesResult[0];
    const budgets = budgetsResult[0];
    const goals = goalsResult[0];

    // Calculate days since first transaction
    const daysSinceStart = transactions.first_transaction_date 
      ? Math.floor((Date.now() - new Date(transactions.first_transaction_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const stats = {
      accounts: {
        total: Number(accounts.total_accounts || 0),
        total_assets: Number(accounts.total_assets || 0),
        total_liabilities: Number(accounts.total_liabilities || 0),
        net_worth: Number(accounts.total_assets || 0) - Number(accounts.total_liabilities || 0),
      },
      transactions: {
        total: Number(transactions.total_transactions || 0),
        total_income: Number(transactions.total_income || 0),
        total_expenses: Number(transactions.total_expenses || 0),
        net_savings: Number(transactions.total_income || 0) - Number(transactions.total_expenses || 0),
        last_transaction_date: transactions.last_transaction_date,
        first_transaction_date: transactions.first_transaction_date,
        days_since_start: daysSinceStart,
        avg_daily_expenses: daysSinceStart > 0 
          ? Number(transactions.total_expenses || 0) / daysSinceStart 
          : 0,
      },
      categories: {
        total: Number(categories.total_categories || 0),
      },
      budgets: {
        total: Number(budgets.total_budgets || 0),
        active: Number(budgets.active_budgets || 0),
      },
      goals: {
        total: Number(goals.total_goals || 0),
        completed: Number(goals.completed_goals || 0),
        total_target_amount: Number(goals.total_target_amount || 0),
        total_saved_amount: Number(goals.total_saved_amount || 0),
        completion_rate: Number(goals.total_goals || 0) > 0
          ? (Number(goals.completed_goals || 0) / Number(goals.total_goals || 0)) * 100
          : 0,
      },
      user: {
        created_at: user.created_at,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('user.stats.error', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
