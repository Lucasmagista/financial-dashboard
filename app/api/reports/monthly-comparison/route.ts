import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

interface MonthlyComparison {
  month: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
  topCategories: Array<{
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get('months') || '6');

    if (monthsBack < 1 || monthsBack > 24) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 24' },
        { status: 400 }
      );
    }

    // Get monthly aggregates
    const result = await sql`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month_key,
        EXTRACT(YEAR FROM date) as year,
        EXTRACT(MONTH FROM date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= CURRENT_DATE - INTERVAL '1 month' * ${monthsBack}
      GROUP BY month_key, year, month
      ORDER BY month_key DESC
    `;

    const monthlyData: MonthlyComparison[] = [];

    for (const row of result) {
      const income = parseFloat(row.total_income || '0');
      const expense = parseFloat(row.total_expense || '0');
      const balance = income - expense;

      // Get top categories for this month
      const categoriesResult = await sql`
        SELECT 
          c.name as category_name,
          SUM(t.amount) as total_amount
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
          AND TO_CHAR(t.date, 'YYYY-MM') = ${row.month_key}
          AND t.type = 'expense'
        GROUP BY c.name
        ORDER BY total_amount DESC
        LIMIT 5
      `;

      const topCategories = categoriesResult.map(cat => ({
        categoryName: cat.category_name || 'Sem categoria',
        amount: parseFloat(cat.total_amount),
        percentage: expense > 0 ? (parseFloat(cat.total_amount) / expense) * 100 : 0,
      }));

      monthlyData.push({
        month: row.month_key,
        year: parseInt(row.year),
        income,
        expense,
        balance,
        transactionCount: parseInt(row.transaction_count),
        topCategories,
      });
    }

    // Calculate month-over-month changes
    const comparisons = monthlyData.map((current, index) => {
      if (index === monthlyData.length - 1) {
        return {
          ...current,
          changes: null,
        };
      }

      const previous = monthlyData[index + 1];
      
      return {
        ...current,
        changes: {
          incomeChange: current.income - previous.income,
          incomeChangePercent: previous.income > 0 
            ? ((current.income - previous.income) / previous.income) * 100 
            : 0,
          expenseChange: current.expense - previous.expense,
          expenseChangePercent: previous.expense > 0 
            ? ((current.expense - previous.expense) / previous.expense) * 100 
            : 0,
          balanceChange: current.balance - previous.balance,
          balanceChangePercent: previous.balance !== 0 
            ? ((current.balance - previous.balance) / Math.abs(previous.balance)) * 100 
            : 0,
        },
      };
    });

    // Calculate averages
    const avgIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length;
    const avgExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0) / monthlyData.length;
    const avgBalance = monthlyData.reduce((sum, m) => sum + m.balance, 0) / monthlyData.length;

    // Find trends
    const incomeGrowing = monthlyData.length > 1 && 
      monthlyData[0].income > monthlyData[monthlyData.length - 1].income;
    const expenseGrowing = monthlyData.length > 1 && 
      monthlyData[0].expense > monthlyData[monthlyData.length - 1].expense;

    return NextResponse.json({
      comparisons,
      summary: {
        averageIncome: avgIncome,
        averageExpense: avgExpense,
        averageBalance: avgBalance,
        totalMonths: monthlyData.length,
        trends: {
          income: incomeGrowing ? 'crescente' : 'decrescente',
          expense: expenseGrowing ? 'crescente' : 'decrescente',
        },
      },
    });
  } catch (error) {
    console.error('Monthly comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to generate comparison' },
      { status: 500 }
    );
  }
}
