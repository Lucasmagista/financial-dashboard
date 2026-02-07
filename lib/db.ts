import { neon } from '@neondatabase/serverless';
import { logger } from './logger';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Configurar timeout e retry para Neon
export const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store'
  },
  fullResults: false,
  arrayMode: false,
});

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: 'checking' | 'savings' | 'investment' | 'credit_card' | 'other';
  balance: number;
  currency: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  is_active: boolean;
  color?: string;
  open_finance_id?: string;
  last_sync_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  transaction_date: Date;
  is_recurring: boolean;
  recurring_frequency?: string;
  tags?: string[];
  notes?: string;
  open_finance_id?: string;
  status?: string;
  provider_code?: string;
  payment_method?: string;
  reference_number?: string;
  mcc?: string;
  bank_category?: string;
  created_at: Date;
  updated_at: Date;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  account_currency?: string;
  account_bank_name?: string;
  account_bank_code?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  parent_id?: string;
  created_at: Date;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: Date;
  end_date?: Date;
  alert_threshold: number;
  created_at: Date;
  updated_at: Date;
  spent?: number;
  category_name?: string;
  category_color?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: Date;
  is_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

// User Functions
export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `;
  return result[0] as User | undefined;
}

export async function createUser(email: string, name: string, passwordHash: string) {
  const result = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id, email, name, created_at
  `;
  return result[0] as User;
}

// Account Functions
export async function getAccountsByUserId(userId: string) {
  const result = await sql`
    SELECT * FROM accounts 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.map(account => ({
    ...account,
    balance: Number(account.balance)
  })) as Account[];
}

export async function getTotalBalance(userId: string | number) {
  const result = await sql`
    SELECT 
      SUM(CASE 
        WHEN account_type IN ('checking', 'savings', 'investment', 'cash', 'other') 
        THEN CASE WHEN balance > 0 THEN balance ELSE 0 END
        ELSE 0 
      END) as total_assets,
      SUM(CASE 
        WHEN account_type = 'credit_card' AND balance < 0
        THEN ABS(balance)
        WHEN account_type = 'credit_card' AND balance >= 0
        THEN 0
        ELSE 0 
      END) as total_liabilities
    FROM accounts 
    WHERE user_id = ${userId} AND is_active = true
  `;
  const row = result[0];

  const totals = {
    total_assets: Number(row.total_assets || 0),
    total_liabilities: Number(row.total_liabilities || 0),
  };

  logger.info('Computed total balance', {
    userId,
    totalAssets: totals.total_assets,
    totalLiabilities: totals.total_liabilities,
  });

  return totals;
}

export async function createAccount(
  userId: string,
  name: string,
  accountType: Account['account_type'],
  balance: number,
  currency: string,
  bankName?: string
) {
  const result = await sql`
    INSERT INTO accounts (user_id, name, account_type, balance, currency, bank_name)
    VALUES (${userId}, ${name}, ${accountType}, ${balance}, ${currency}, ${bankName || null})
    RETURNING *
  `;
  const account = result[0];
  return {
    ...account,
    balance: Number(account.balance)
  } as Account;
}

export async function updateAccountBalance(accountId: string, newBalance: number) {
  const result = await sql`
    UPDATE accounts 
    SET balance = ${newBalance}, last_sync_at = NOW()
    WHERE id = ${accountId}
    RETURNING *
  `;
  const account = result[0];
  return {
    ...account,
    balance: Number(account.balance)
  } as Account;
}

// Transaction Functions
export async function getTransactionsByUserId(userId: string, limit = 50) {
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
    LIMIT ${limit}
  `;
  return result.map(transaction => ({
    ...transaction,
    amount: Number(transaction.amount)
  })) as Transaction[];
}

export async function getTransactionsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
) {
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
      AND t.transaction_date >= ${startDate.toISOString()}
      AND t.transaction_date <= ${endDate.toISOString()}
    ORDER BY t.transaction_date DESC
  `;
  return result.map(transaction => ({
    ...transaction,
    amount: Number(transaction.amount)
  })) as Transaction[];
}

export async function createTransaction(
  userId: string,
  accountId: string,
  amount: number,
  type: 'income' | 'expense' | 'transfer',
  description: string,
  transactionDate: Date,
  categoryId?: string,
  isRecurring = false
) {
  const result = await sql`
    INSERT INTO transactions (
      user_id, account_id, amount, type, description, transaction_date, category_id, is_recurring
    )
    VALUES (
      ${userId}, ${accountId}, ${amount}, ${type}, ${description}, 
      ${transactionDate.toISOString()}, ${categoryId || null}, ${isRecurring}
    )
    RETURNING *
  `;
  const transaction = result[0];
  return {
    ...transaction,
    amount: Number(transaction.amount)
  } as Transaction;
}

export async function deleteTransaction(transactionId: string) {
  await sql`DELETE FROM transactions WHERE id = ${transactionId}`;
}

// Category Functions
export async function getCategoriesByUserId(userId: string) {
  const result = await sql`
    SELECT * FROM categories 
    WHERE user_id = ${userId}
    ORDER BY name ASC
  `;
  return result as Category[];
}

export async function createCategory(
  userId: string,
  name: string,
  type: 'income' | 'expense',
  color: string,
  icon: string
) {
  const result = await sql`
    INSERT INTO categories (user_id, name, type, color, icon)
    VALUES (${userId}, ${name}, ${type}, ${color}, ${icon})
    RETURNING *
  `;
  return result[0] as Category;
}

// Analytics Functions
export async function getMonthlySpending(userId: string, year: number, month: number) {
  const result = await sql`
    SELECT 
      c.name as category,
      c.color,
      SUM(t.amount) as total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
      AND t.type = 'expense'
      AND EXTRACT(YEAR FROM t.transaction_date) = ${year}
      AND EXTRACT(MONTH FROM t.transaction_date) = ${month}
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
  `;
  return result;
}

export async function getIncomeVsExpenses(userId: string, months = 6) {
  const result = await sql`
    SELECT 
      TO_CHAR(t.transaction_date, 'YYYY-MM') as month,
      SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
    FROM transactions t
    INNER JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ${userId}
      AND a.is_active = true
      AND t.transaction_date >= NOW() - INTERVAL '6 months'
    GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const mapped = result.map(r => ({
    ...r,
    income: Number(r.income || 0),
    expenses: Number(r.expenses || 0),
  }));

  logger.info('Fetched income vs expenses', {
    userId,
    monthsReturned: mapped.length,
  });

  return mapped;
}

export async function getCategoryBreakdown(userId: string, type: 'income' | 'expense') {
  const result = await sql`
    SELECT 
      COALESCE(c.name, 'Sem Categoria') as name,
      COALESCE(c.color, '#9CA3AF') as color,
      COALESCE(c.icon, 'circle') as icon,
      SUM(ABS(t.amount)) as total,
      COUNT(t.id) as transaction_count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    INNER JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ${userId}
      AND t.type = ${type}
      AND a.is_active = true
      AND t.transaction_date >= NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC
  `;
  return result;
}

// Budget Functions
export async function getBudgetsByUserId(userId: string) {
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
  return result.map(budget => ({
    ...budget,
    amount: Number(budget.amount),
    spent: Number(budget.spent)
  })) as Budget[];
}

export async function createBudget(
  userId: string,
  categoryId: string,
  name: string,
  amount: number,
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate: Date,
  endDate?: Date
) {
  const result = await sql`
    INSERT INTO budgets (user_id, category_id, name, amount, period, start_date, end_date)
    VALUES (${userId}, ${categoryId}, ${name}, ${amount}, ${period}, ${startDate.toISOString()}, ${endDate?.toISOString() || null})
    RETURNING *
  `;
  const budget = result[0];
  return {
    ...budget,
    amount: Number(budget.amount)
  } as Budget;
}

// Goal Functions
export async function getGoalsByUserId(userId: string) {
  try {
    const result = await sql`
      SELECT * FROM goals 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.map(goal => ({
      ...goal,
      target_amount: Number(goal.target_amount),
      current_amount: Number(goal.current_amount)
    })) as Goal[];
  } catch (error) {
    logger.error('Error fetching goals', error, { userId });
    return []; // Retorna array vazio em caso de erro
  }
}

export async function createGoal(
  userId: string,
  name: string,
  targetAmount: number,
  currentAmount = 0,
  targetDate?: Date
) {
  const result = await sql`
    INSERT INTO goals (user_id, name, target_amount, current_amount, target_date)
    VALUES (${userId}, ${name}, ${targetAmount}, ${currentAmount}, ${targetDate?.toISOString() || null})
    RETURNING *
  `;
  const goal = result[0];
  return {
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount)
  } as Goal;
}

export async function updateGoalProgress(goalId: string, currentAmount: number) {
  const result = await sql`
    UPDATE goals 
    SET current_amount = ${currentAmount}
    WHERE id = ${goalId}
    RETURNING *
  `;
  const goal = result[0];
  return {
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount)
  } as Goal;
}

export async function updateBudget(
  budgetId: string,
  data: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.amount !== undefined) {
    updates.push(`amount = $${paramCount++}`);
    values.push(data.amount);
  }
  if (data.period !== undefined) {
    updates.push(`period = $${paramCount++}`);
    values.push(data.period);
  }
  if (data.category_id !== undefined) {
    updates.push(`category_id = $${paramCount++}`);
    values.push(data.category_id);
  }
  if (data.start_date !== undefined) {
    updates.push(`start_date = $${paramCount++}`);
    values.push(data.start_date);
  }
  if (data.end_date !== undefined) {
    updates.push(`end_date = $${paramCount++}`);
    values.push(data.end_date);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(budgetId);
  const result = await sql`
    UPDATE budgets 
    SET ${sql.raw(updates.join(', '))}, updated_at = NOW()
    WHERE id = ${budgetId}
    RETURNING *
  `;
  const budget = result[0];
  return {
    ...budget,
    amount: Number(budget.amount)
  } as Budget;
}

export async function deleteBudget(budgetId: string) {
  await sql`DELETE FROM budgets WHERE id = ${budgetId}`;
}

export async function updateGoal(
  goalId: string,
  data: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) updates.push('name'), values.push(data.name);
  if (data.target_amount !== undefined) updates.push('target_amount'), values.push(data.target_amount);
  if (data.current_amount !== undefined) updates.push('current_amount'), values.push(data.current_amount);
  if (data.target_date !== undefined) updates.push('target_date'), values.push(data.target_date);
  if (data.is_completed !== undefined) updates.push('is_completed'), values.push(data.is_completed);

  if (updates.length === 0) throw new Error('No fields to update');

  const setClauses = updates.map((field, i) => `${field} = $${i + 1}`).join(', ');
  values.push(goalId);

  const result = await sql.raw(
    `UPDATE goals SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  const goal = result.rows[0];
  return {
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount)
  } as Goal;
}

export async function deleteGoal(goalId: string) {
  await sql`DELETE FROM goals WHERE id = ${goalId}`;
}

export async function updateAccount(
  accountId: string,
  data: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.account_type !== undefined) {
    updates.push(`account_type = $${paramIndex++}`);
    values.push(data.account_type);
  }
  if (data.balance !== undefined) {
    updates.push(`balance = $${paramIndex++}`);
    values.push(data.balance);
  }
  if (data.currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`);
    values.push(data.currency);
  }
  if (data.bank_name !== undefined) {
    updates.push(`bank_name = $${paramIndex++}`);
    values.push(data.bank_name);
  }
  if (data.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(data.is_active);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(data.color);
  }

  if (updates.length === 0) throw new Error('No fields to update');

  values.push(accountId);
  
  // Build query with proper parameterization for Neon
  let query = 'UPDATE accounts SET ';
  query += updates.join(', ');
  query += `, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

  const result = await sql.query(query, values);
  const account = result.rows[0];
  return {
    ...account,
    balance: Number(account.balance)
  } as Account;
}

export async function deleteAccount(accountId: string) {
  await sql`DELETE FROM accounts WHERE id = ${accountId}`;
}

export async function updateCategory(
  categoryId: string,
  data: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>
) {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) updates.push('name'), values.push(data.name);
  if (data.type !== undefined) updates.push('type'), values.push(data.type);
  if (data.color !== undefined) updates.push('color'), values.push(data.color);
  if (data.icon !== undefined) updates.push('icon'), values.push(data.icon);

  if (updates.length === 0) throw new Error('No fields to update');

  const setClauses = updates.map((field, i) => `${field} = $${i + 1}`).join(', ');
  values.push(categoryId);

  const result = await sql.raw(
    `UPDATE categories SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] as Category;
}

export async function deleteCategory(categoryId: string) {
  await sql`DELETE FROM categories WHERE id = ${categoryId}`;
}

export async function updateTransaction(
  transactionId: string,
  data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.account_id !== undefined) updates.push('account_id'), values.push(data.account_id);
  if (data.category_id !== undefined) updates.push('category_id'), values.push(data.category_id);
  if (data.amount !== undefined) updates.push('amount'), values.push(data.amount);
  if (data.type !== undefined) updates.push('type'), values.push(data.type);
  if (data.description !== undefined) updates.push('description'), values.push(data.description);
  if (data.transaction_date !== undefined) updates.push('transaction_date'), values.push(data.transaction_date);
  if (data.is_recurring !== undefined) updates.push('is_recurring'), values.push(data.is_recurring);
  if (data.notes !== undefined) updates.push('notes'), values.push(data.notes);
  if (data.tags !== undefined) updates.push('tags'), values.push(data.tags);

  if (updates.length === 0) throw new Error('No fields to update');

  const setClauses = updates.map((field, i) => `${field} = $${i + 1}`).join(', ');
  values.push(transactionId);

  const result = await sql.raw(
    `UPDATE transactions SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  const transaction = result.rows[0];
  return {
    ...transaction,
    amount: Number(transaction.amount)
  } as Transaction;
}
