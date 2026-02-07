import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

interface Pattern {
  type: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  details: any;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patterns: Pattern[] = [];

    // Pattern 1: High spending days of the week
    const dayOfWeekResult = await sql`
      SELECT 
        EXTRACT(DOW FROM date) as day_of_week,
        TO_CHAR(date, 'Day') as day_name,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY day_of_week, day_name
      ORDER BY total_amount DESC
    `;

    if (dayOfWeekResult.length > 0) {
      const topDay = dayOfWeekResult[0];
      const avgDaySpending = dayOfWeekResult.reduce((sum, row) => 
        sum + parseFloat(row.total_amount), 0) / dayOfWeekResult.length;
      
      if (parseFloat(topDay.total_amount) > avgDaySpending * 1.3) {
        patterns.push({
          type: 'high_spending_day',
          description: `Você gasta mais às ${topDay.day_name.trim()}s`,
          impact: 'negative',
          details: {
            dayOfWeek: topDay.day_name.trim(),
            totalAmount: parseFloat(topDay.total_amount),
            transactionCount: parseInt(topDay.transaction_count),
            avgAmount: parseFloat(topDay.avg_amount),
            percentageAboveAverage: ((parseFloat(topDay.total_amount) - avgDaySpending) / avgDaySpending) * 100,
          },
        });
      }
    }

    // Pattern 2: End-of-month spending spikes
    const endOfMonthResult = await sql`
      SELECT 
        EXTRACT(DAY FROM date) as day,
        SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY day
      HAVING EXTRACT(DAY FROM date) >= 25
      ORDER BY total_amount DESC
    `;

    const beginningOfMonthResult = await sql`
      SELECT 
        SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= CURRENT_DATE - INTERVAL '3 months'
        AND EXTRACT(DAY FROM date) <= 5
    `;

    const endOfMonthTotal = endOfMonthResult.reduce((sum, row) => 
      sum + parseFloat(row.total_amount || '0'), 0);
    const beginningOfMonthTotal = parseFloat(beginningOfMonthResult[0]?.total_amount || '0');

    if (endOfMonthTotal > beginningOfMonthTotal * 1.5) {
      patterns.push({
        type: 'end_of_month_spike',
        description: 'Gastos aumentam no final do mês',
        impact: 'negative',
        details: {
          endOfMonthTotal,
          beginningOfMonthTotal,
          difference: endOfMonthTotal - beginningOfMonthTotal,
          percentageHigher: ((endOfMonthTotal - beginningOfMonthTotal) / beginningOfMonthTotal) * 100,
        },
      });
    }

    // Pattern 3: Recurring merchants/descriptions
    const recurringMerchantsResult = await sql`
      SELECT 
        description,
        COUNT(*) as frequency,
        AVG(amount) as avg_amount,
        SUM(amount) as total_amount
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY description
      HAVING COUNT(*) >= 3
      ORDER BY frequency DESC
      LIMIT 10
    `;

    if (recurringMerchantsResult.length > 0) {
      patterns.push({
        type: 'recurring_merchants',
        description: `Você tem ${recurringMerchantsResult.length} estabelecimentos frequentes`,
        impact: 'neutral',
        details: {
          merchants: recurringMerchantsResult.map(row => ({
            name: row.description,
            frequency: parseInt(row.frequency),
            avgAmount: parseFloat(row.avg_amount),
            totalAmount: parseFloat(row.total_amount),
          })),
        },
      });
    }

    // Pattern 4: Category concentration
    const categoryConcentrationResult = await sql`
      SELECT 
        c.name as category_name,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
        AND t.type = 'expense'
        AND t.date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY c.name
      ORDER BY total_amount DESC
    `;

    const totalExpenses = categoryConcentrationResult.reduce((sum, row) => 
      sum + parseFloat(row.total_amount), 0);

    if (categoryConcentrationResult.length > 0) {
      const topCategory = categoryConcentrationResult[0];
      const percentage = (parseFloat(topCategory.total_amount) / totalExpenses) * 100;

      if (percentage > 40) {
        patterns.push({
          type: 'category_concentration',
          description: `${percentage.toFixed(1)}% dos gastos em ${topCategory.category_name || 'uma categoria'}`,
          impact: 'negative',
          details: {
            categoryName: topCategory.category_name || 'Sem categoria',
            amount: parseFloat(topCategory.total_amount),
            percentage,
            transactionCount: parseInt(topCategory.transaction_count),
          },
        });
      }
    }

    // Pattern 5: Unusual large transactions
    const avgTransactionResult = await sql`
      SELECT AVG(amount) as avg_amount, STDDEV(amount) as stddev_amount
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= CURRENT_DATE - INTERVAL '3 months'
    `;

    const avgAmount = parseFloat(avgTransactionResult[0]?.avg_amount || '0');
    const stddevAmount = parseFloat(avgTransactionResult[0]?.stddev_amount || '0');

    if (stddevAmount > 0) {
      const threshold = avgAmount + (stddevAmount * 2);
      const unusualTransactionsResult = await sql`
        SELECT 
          description,
          amount,
          date,
          c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId}
          AND t.type = 'expense'
          AND t.date >= CURRENT_DATE - INTERVAL '1 month'
          AND t.amount > ${threshold}
        ORDER BY t.amount DESC
        LIMIT 5
      `;

      if (unusualTransactionsResult.length > 0) {
        patterns.push({
          type: 'unusual_large_transactions',
          description: `${unusualTransactionsResult.length} transação(ões) acima do padrão no último mês`,
          impact: 'negative',
          details: {
            transactions: unusualTransactionsResult.map(row => ({
              description: row.description,
              amount: parseFloat(row.amount),
              date: row.date,
              category: row.category_name,
              timesAboveAverage: parseFloat(row.amount) / avgAmount,
            })),
            avgAmount,
          },
        });
      }
    }

    // Pattern 6: Positive savings trend
    const savingsResult = await sql`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY month
      ORDER BY month ASC
    `;

    if (savingsResult.length >= 2) {
      const balances = savingsResult.map(row => parseFloat(row.balance));
      const isIncreasing = balances.every((val, i) => i === 0 || val >= balances[i - 1]);

      if (isIncreasing && balances[balances.length - 1] > 0) {
        patterns.push({
          type: 'positive_savings_trend',
          description: 'Parabéns! Seu saldo está crescendo consistentemente',
          impact: 'positive',
          details: {
            months: savingsResult.map(row => ({
              month: row.month,
              balance: parseFloat(row.balance),
            })),
            growth: balances[balances.length - 1] - balances[0],
          },
        });
      }
    }

    // Pattern 7: Weekend vs weekday spending
    const weekendSpendingResult = await sql`
      SELECT 
        CASE 
          WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'weekend'
          ELSE 'weekday'
        END as period_type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'expense'
        AND date >= CURRENT_DATE - INTERVAL '3 months'
      GROUP BY period_type
    `;

    if (weekendSpendingResult.length === 2) {
      const weekend = weekendSpendingResult.find(r => r.period_type === 'weekend');
      const weekday = weekendSpendingResult.find(r => r.period_type === 'weekday');

      if (weekend && weekday) {
        const weekendAvg = parseFloat(weekend.total_amount) / 8; // Approximate days
        const weekdayAvg = parseFloat(weekday.total_amount) / 20; // Approximate days

        if (weekendAvg > weekdayAvg * 1.3) {
          patterns.push({
            type: 'weekend_overspending',
            description: 'Gastos no fim de semana são maiores que durante a semana',
            impact: 'negative',
            details: {
              weekendTotal: parseFloat(weekend.total_amount),
              weekdayTotal: parseFloat(weekday.total_amount),
              weekendAvgPerDay: weekendAvg,
              weekdayAvgPerDay: weekdayAvg,
              percentageHigher: ((weekendAvg - weekdayAvg) / weekdayAvg) * 100,
            },
          });
        }
      }
    }

    return NextResponse.json({
      patterns,
      summary: {
        totalPatterns: patterns.length,
        positivePatterns: patterns.filter(p => p.impact === 'positive').length,
        negativePatterns: patterns.filter(p => p.impact === 'negative').length,
        neutralPatterns: patterns.filter(p => p.impact === 'neutral').length,
      },
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze patterns' },
      { status: 500 }
    );
  }
}
