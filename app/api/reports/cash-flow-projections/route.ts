import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

interface Projection {
  month: string;
  projectedIncome: number;
  projectedExpense: number;
  projectedBalance: number;
  confidence: number;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsAhead = parseInt(searchParams.get('months') || '6');

    if (monthsAhead < 1 || monthsAhead > 12) {
      return NextResponse.json(
        { error: 'Months must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Get historical data (last 6 months)
    const historicalResult = await sql`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month_key,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id = ${userId}
        AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY month_key
      ORDER BY month_key DESC
    `;

    const historicalData = historicalResult.map(row => ({
      income: parseFloat(row.total_income || '0'),
      expense: parseFloat(row.total_expense || '0'),
    }));

    if (historicalData.length < 2) {
      return NextResponse.json(
        { error: 'Not enough historical data for projections (minimum 2 months)' },
        { status: 400 }
      );
    }

    // Calculate averages and trends
    const avgIncome = historicalData.reduce((sum, d) => sum + d.income, 0) / historicalData.length;
    const avgExpense = historicalData.reduce((sum, d) => sum + d.expense, 0) / historicalData.length;

    // Calculate linear trend (simple moving average with growth rate)
    const incomeGrowthRate = historicalData.length > 1
      ? (historicalData[0].income - historicalData[historicalData.length - 1].income) / 
        (historicalData.length - 1)
      : 0;

    const expenseGrowthRate = historicalData.length > 1
      ? (historicalData[0].expense - historicalData[historicalData.length - 1].expense) / 
        (historicalData.length - 1)
      : 0;

    // Get recurring transactions that will occur in the future
    const recurringResult = await sql`
      SELECT 
        amount,
        type,
        frequency,
        next_occurrence
      FROM recurring_transactions
      WHERE user_id = ${userId}
        AND is_active = true
        AND auto_create = true
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `;

    // Generate projections
    const projections: Projection[] = [];
    const currentDate = new Date();

    for (let i = 1; i <= monthsAhead; i++) {
      const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthKey = `${projectionDate.getFullYear()}-${String(projectionDate.getMonth() + 1).padStart(2, '0')}`;

      // Base projection on trend
      let projectedIncome = avgIncome + (incomeGrowthRate * i);
      let projectedExpense = avgExpense + (expenseGrowthRate * i);

      // Add recurring transactions
      const monthStart = new Date(projectionDate.getFullYear(), projectionDate.getMonth(), 1);
      const monthEnd = new Date(projectionDate.getFullYear(), projectionDate.getMonth() + 1, 0);

      for (const recurring of recurringResult) {
        const nextOccurrence = new Date(recurring.next_occurrence);
        
        // Count how many times this recurring transaction will occur in this month
        let occurrences = 0;
        
        if (recurring.frequency === 'monthly' && nextOccurrence >= monthStart && nextOccurrence <= monthEnd) {
          occurrences = 1;
        } else if (recurring.frequency === 'weekly') {
          const weeksInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          occurrences = weeksInMonth;
        } else if (recurring.frequency === 'daily') {
          occurrences = monthEnd.getDate();
        } else if (recurring.frequency === 'yearly' && 
                   nextOccurrence.getMonth() === projectionDate.getMonth()) {
          occurrences = 1;
        }

        const amount = parseFloat(recurring.amount) * occurrences;
        if (recurring.type === 'income') {
          projectedIncome += amount;
        } else {
          projectedExpense += amount;
        }
      }

      // Ensure non-negative values
      projectedIncome = Math.max(0, projectedIncome);
      projectedExpense = Math.max(0, projectedExpense);

      // Calculate confidence (decreases over time)
      const confidence = Math.max(0.5, 1 - (i * 0.08));

      projections.push({
        month: monthKey,
        projectedIncome,
        projectedExpense,
        projectedBalance: projectedIncome - projectedExpense,
        confidence,
      });
    }

    // Calculate cumulative balance
    let currentBalance = 0;
    
    // Get current actual balance
    const balanceResult = await sql`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
      FROM transactions
      WHERE user_id = ${userId}
    `;

    currentBalance = parseFloat(balanceResult[0]?.balance || '0');

    const projectionsWithCumulative = projections.map(proj => {
      currentBalance += proj.projectedBalance;
      return {
        ...proj,
        cumulativeBalance: currentBalance,
      };
    });

    // Generate insights
    const insights: string[] = [];
    
    const negativeMonths = projectionsWithCumulative.filter(p => p.projectedBalance < 0).length;
    if (negativeMonths > 0) {
      insights.push(`Atenção: ${negativeMonths} mês(es) com saldo negativo projetado`);
    }

    const finalBalance = projectionsWithCumulative[projectionsWithCumulative.length - 1].cumulativeBalance;
    if (finalBalance < 0) {
      insights.push('Alerta: Saldo acumulado negativo ao final do período');
    } else if (finalBalance > currentBalance * 2) {
      insights.push('Tendência positiva: Crescimento acelerado projetado');
    }

    if (incomeGrowthRate > 0) {
      insights.push('Receitas em tendência de crescimento');
    } else if (incomeGrowthRate < 0) {
      insights.push('Atenção: Receitas em tendência de queda');
    }

    if (expenseGrowthRate > avgIncome * 0.01) {
      insights.push('Alerta: Despesas crescendo mais rápido que o normal');
    }

    return NextResponse.json({
      projections: projectionsWithCumulative,
      currentBalance,
      summary: {
        averageMonthlyIncome: avgIncome,
        averageMonthlyExpense: avgExpense,
        averageMonthlyBalance: avgIncome - avgExpense,
        incomeGrowthRate,
        expenseGrowthRate,
        totalRecurringTransactions: recurringResult.length,
      },
      insights,
    });
  } catch (error) {
    console.error('Cash flow projection error:', error);
    return NextResponse.json(
      { error: 'Failed to generate projections' },
      { status: 500 }
    );
  }
}
