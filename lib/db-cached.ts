// Database functions with cache layer
// Drop-in replacement for db.ts with automatic caching

import { sql } from './db';
import { withCache, cacheKeys, CACHE_TTL, cacheDel } from './cache';
import { getPaginationParams, createPaginationResult, PaginationResult } from './pagination';

// Get accounts with cache
export async function getAccountsByUserIdCached(userId: string) {
  return withCache(
    cacheKeys.accounts(userId),
    CACHE_TTL.ACCOUNTS,
    async () => {
      const result = await sql`
        SELECT * FROM accounts 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return result;
    }
  );
}

// Get transactions with pagination and cache
export async function getTransactionsPaginated(
  userId: string,
  page?: number,
  limit?: number
): Promise<PaginationResult<any>> {
  const { offset, limit: parsedLimit, page: parsedPage } = getPaginationParams(page, limit);

  // Get total count
  const countResult = await sql`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE user_id = ${userId}
  `;
  const total = Number(countResult[0].count);

  // Get paginated data with cache
  const data = await withCache(
    cacheKeys.transactions(userId, parsedLimit, offset),
    CACHE_TTL.TRANSACTIONS,
    async () => {
      const result = await sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          a.name as account_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${userId}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${parsedLimit}
        OFFSET ${offset}
      `;
      return result;
    }
  );

  return createPaginationResult(data, total, parsedPage, parsedLimit);
}

// Get categories with cache
export async function getCategoriesByUserIdCached(userId: string) {
  return withCache(
    cacheKeys.categories(userId),
    CACHE_TTL.CATEGORIES,
    async () => {
      const result = await sql`
        SELECT * FROM categories 
        WHERE user_id = ${userId}
        ORDER BY name ASC
      `;
      return result;
    }
  );
}

// Get total balance with cache
export async function getTotalBalanceCached(userId: string) {
  return withCache(
    cacheKeys.totalBalance(userId),
    CACHE_TTL.USER_DATA,
    async () => {
      const result = await sql`
        SELECT 
          SUM(CASE WHEN account_type IN ('checking', 'savings', 'investment') THEN balance ELSE 0 END) as total_assets,
          SUM(CASE WHEN account_type = 'credit_card' THEN ABS(balance) ELSE 0 END) as total_liabilities
        FROM accounts 
        WHERE user_id = ${userId}
      `;
      return result[0];
    }
  );
}

// Get income vs expenses with cache
export async function getIncomeVsExpensesCached(userId: string, months = 6) {
  return withCache(
    cacheKeys.incomeExpenses(userId, months),
    CACHE_TTL.ANALYTICS,
    async () => {
      const result = await sql`
        SELECT 
          TO_CHAR(t.transaction_date, 'YYYY-MM') as month,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
        FROM transactions t
        WHERE t.user_id = ${userId}
          AND t.transaction_date >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM')
        ORDER BY month ASC
      `;
      return result;
    }
  );
}

// Get category breakdown with cache
export async function getCategoryBreakdownCached(userId: string, type: 'income' | 'expense') {
  return withCache(
    cacheKeys.categoryBreakdown(userId, type),
    CACHE_TTL.ANALYTICS,
    async () => {
      const result = await sql`
        SELECT 
          c.name,
          c.color,
          c.icon,
          SUM(t.amount) as total,
          COUNT(t.id) as transaction_count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
          AND t.type = ${type}
          AND t.transaction_date >= NOW() - INTERVAL '30 days'
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY total DESC
      `;
      return result;
    }
  );
}

// Get budgets with cache
export async function getBudgetsByUserIdCached(userId: string) {
  return withCache(
    cacheKeys.budgets(userId),
    CACHE_TTL.BUDGETS,
    async () => {
      const result = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          c.color as category_color,
          COALESCE(SUM(t.amount), 0) as spent
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN transactions t ON t.category_id = b.category_id 
          AND t.transaction_date >= b.start_date 
          AND (b.end_date IS NULL OR t.transaction_date <= b.end_date)
          AND t.type = 'expense'
        WHERE b.user_id = ${userId}
        GROUP BY b.id, c.name, c.color
        ORDER BY b.created_at DESC
      `;
      return result;
    }
  );
}

// Get goals with cache
export async function getGoalsByUserIdCached(userId: string) {
  return withCache(
    cacheKeys.goals(userId),
    CACHE_TTL.GOALS,
    async () => {
      const result = await sql`
        SELECT * FROM goals 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return result;
    }
  );
}

// Invalidate cache after mutations
export async function invalidateTransactionCache(userId: string) {
  await cacheDel([
    cacheKeys.totalBalance(userId),
    cacheKeys.accounts(userId),
  ]);

  // Also clear all transaction and analytics caches
  // Pattern matching would be better but we'll clear specific keys
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 100; j += 20) {
      await cacheDel(cacheKeys.transactions(userId, 20, j));
    }
  }
}

// Export aliases for compatibility
export const getCachedTransactions = getTransactionsPaginated;
export const invalidateTransactionsCache = invalidateTransactionCache;
