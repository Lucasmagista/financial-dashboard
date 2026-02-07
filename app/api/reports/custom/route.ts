import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

interface CustomReportConfig {
  name: string;
  description?: string;
  metrics: Array<'income' | 'expense' | 'balance' | 'transaction_count' | 'avg_transaction' | 'top_categories' | 'top_merchants'>;
  groupBy: 'day' | 'week' | 'month' | 'year' | 'category' | 'account';
  startDate: string;
  endDate: string;
  filters?: {
    categoryIds?: string[];
    accountIds?: string[];
    type?: 'income' | 'expense';
    minAmount?: number;
    maxAmount?: number;
  };
}

// Create custom report
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config: CustomReportConfig = await request.json();
    const { startDate, endDate, filters, groupBy, metrics, name, description } = config;

    // Get main data based on groupBy
    let mainData;
    
    if (groupBy === 'month') {
      mainData = await sql`
        SELECT 
          TO_CHAR(t.transaction_date, 'YYYY-MM') as group_key,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as balance,
          COUNT(*) as transaction_count,
          AVG(t.amount) as avg_transaction
        FROM transactions t
        WHERE t.user_id = ${userId}
          AND t.transaction_date >= ${startDate}
          AND t.transaction_date <= ${endDate}
          ${filters?.type ? sql`AND t.type = ${filters.type}` : sql``}
          ${filters?.minAmount !== undefined ? sql`AND t.amount >= ${filters.minAmount}` : sql``}
          ${filters?.maxAmount !== undefined ? sql`AND t.amount <= ${filters.maxAmount}` : sql``}
        GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM')
        ORDER BY group_key DESC
      `;
    } else if (groupBy === 'category') {
      mainData = await sql`
        SELECT 
          COALESCE(c.name, 'Sem Categoria') as group_key,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as balance,
          COUNT(*) as transaction_count,
          AVG(t.amount) as avg_transaction
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
          AND t.transaction_date >= ${startDate}
          AND t.transaction_date <= ${endDate}
          ${filters?.type ? sql`AND t.type = ${filters.type}` : sql``}
        GROUP BY c.name
        ORDER BY expense DESC
      `;
    } else {
      // Default to daily
      mainData = await sql`
        SELECT 
          TO_CHAR(t.transaction_date, 'YYYY-MM-DD') as group_key,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense,
          COUNT(*) as transaction_count
        FROM transactions t
        WHERE t.user_id = ${userId}
          AND t.transaction_date >= ${startDate}
          AND t.transaction_date <= ${endDate}
          ${filters?.type ? sql`AND t.type = ${filters.type}` : sql``}
        GROUP BY TO_CHAR(t.transaction_date, 'YYYY-MM-DD')
        ORDER BY group_key DESC
      `;
    }

    // Get top categories if requested
    let topCategories = null;
    if (metrics.includes('top_categories')) {
      topCategories = await sql`
        SELECT 
          c.name as category_name,
          c.color as category_color,
          SUM(t.amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
          AND t.transaction_date >= ${startDate}
          AND t.transaction_date <= ${endDate}
          AND t.type = 'expense'
        GROUP BY c.name, c.color
        ORDER BY total_amount DESC
        LIMIT 10
      `;
    }

    // Get summary
    const summaryResult = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COUNT(*) as total_transactions,
        COALESCE(AVG(t.amount), 0) as avg_transaction,
        COALESCE(MIN(t.amount), 0) as min_transaction,
        COALESCE(MAX(t.amount), 0) as max_transaction
      FROM transactions t
      WHERE t.user_id = ${userId}
        AND t.transaction_date >= ${startDate}
        AND t.transaction_date <= ${endDate}
        ${filters?.type ? sql`AND t.type = ${filters.type}` : sql``}
    `;

    const summary = summaryResult[0];

    return NextResponse.json({
      report: {
        name,
        description,
        period: { start: startDate, end: endDate },
        groupBy,
        data: mainData,
      },
      topCategories,
      summary: {
        totalIncome: parseFloat(summary.total_income || '0'),
        totalExpense: parseFloat(summary.total_expense || '0'),
        balance: parseFloat(summary.total_income || '0') - parseFloat(summary.total_expense || '0'),
        totalTransactions: parseInt(summary.total_transactions || '0'),
        avgTransaction: parseFloat(summary.avg_transaction || '0'),
        minTransaction: parseFloat(summary.min_transaction || '0'),
        maxTransaction: parseFloat(summary.max_transaction || '0'),
      },
    });
  } catch (error) {
    console.error('Custom report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom report' },
      { status: 500 }
    );
  }
}

// Save report configuration
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config: CustomReportConfig = await request.json();

    const result = await sql`
      INSERT INTO saved_reports (user_id, name, description, config, created_at, updated_at)
      VALUES (${userId}, ${config.name}, ${config.description || null}, ${JSON.stringify(config)}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      savedReport: result[0],
    });
  } catch (error) {
    console.error('Save report error:', error);
    return NextResponse.json(
      { error: 'Failed to save report configuration' },
      { status: 500 }
    );
  }
}

// Get saved reports
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT * FROM saved_reports WHERE user_id = ${userId} ORDER BY updated_at DESC
    `;

    return NextResponse.json({
      savedReports: result,
    });
  } catch (error) {
    console.error('Get saved reports error:', error);
    return NextResponse.json(
      { error: 'Failed to get saved reports' },
      { status: 500 }
    );
  }
}
