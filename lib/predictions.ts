import { getIncomeVsExpenses, getTransactionsByDateRange } from './db';
import { logger } from './logger';

export interface Prediction {
  predicted: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentageChange: number;
}

export async function predictNextMonthExpenses(
  userId: string
): Promise<Prediction> {
  try {
    const last6Months = await getIncomeVsExpenses(userId, 6);

    if (last6Months.length < 3) {
      return {
        predicted: 0,
        confidence: 0,
        trend: 'stable',
        percentageChange: 0,
      };
    }

    // Calculate moving average
    const expenses = last6Months.map((m) => Number(m.expenses));
    const avgExpenses = expenses.reduce((sum, e) => sum + e, 0) / expenses.length;

    // Detect trend using linear regression
    const { slope, intercept } = linearRegression(expenses);

    // Predict next month
    const nextMonthPrediction = slope * expenses.length + intercept;

    // Calculate trend
    const recentExpenses = Number(last6Months[last6Months.length - 1].expenses);
    const percentageChange = ((nextMonthPrediction - avgExpenses) / avgExpenses) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(percentageChange) < 5) {
      trend = 'stable';
    } else if (percentageChange > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate confidence based on data consistency
    const variance = expenses.reduce(
      (sum, e) => sum + Math.pow(e - avgExpenses, 2),
      0
    ) / expenses.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgExpenses) * 100;
    
    // Lower CV = higher confidence
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation));

    return {
      predicted: Math.max(0, nextMonthPrediction),
      confidence: confidence / 100,
      trend,
      percentageChange,
    };
  } catch (error) {
    logger.error('Error predicting expenses', error, { userId });
    return {
      predicted: 0,
      confidence: 0,
      trend: 'stable',
      percentageChange: 0,
    };
  }
}

export async function predictCategorySpending(
  userId: string,
  categoryId: string
): Promise<Prediction> {
  try {
    const last3Months = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const transactions = await getTransactionsByDateRange(
      userId,
      last3Months,
      new Date()
    );

    const categoryTransactions = transactions.filter(
      (t) => t.category_id === categoryId && t.type === 'expense'
    );

    if (categoryTransactions.length < 5) {
      return {
        predicted: 0,
        confidence: 0,
        trend: 'stable',
        percentageChange: 0,
      };
    }

    // Group by month
    const monthlySpending = new Map<string, number>();
    categoryTransactions.forEach((t) => {
      const month = new Date(t.transaction_date).toISOString().slice(0, 7);
      monthlySpending.set(
        month,
        (monthlySpending.get(month) || 0) + Number(t.amount)
      );
    });

    const spending = Array.from(monthlySpending.values());
    const avgSpending = spending.reduce((sum, s) => sum + s, 0) / spending.length;

    const { slope } = linearRegression(spending);
    const prediction = slope * spending.length + avgSpending;

    const percentageChange = ((prediction - avgSpending) / avgSpending) * 100;
    let trend: 'increasing' | 'decreasing' | 'stable';

    if (Math.abs(percentageChange) < 10) {
      trend = 'stable';
    } else if (percentageChange > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      predicted: Math.max(0, prediction),
      confidence: spending.length >= 3 ? 0.7 : 0.5,
      trend,
      percentageChange,
    };
  } catch (error) {
    logger.error('Error predicting category spending', error, {
      userId,
      categoryId,
    });
    return {
      predicted: 0,
      confidence: 0,
      trend: 'stable',
      percentageChange: 0,
    };
  }
}

function linearRegression(
  values: number[]
): { slope: number; intercept: number } {
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((sum, i) => sum + i, 0);
  const sumY = values.reduce((sum, v) => sum + v, 0);
  const sumXY = indices.reduce((sum, i) => sum + i * values[i], 0);
  const sumXX = indices.reduce((sum, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function getInsightMessage(prediction: Prediction): string {
  const { trend, percentageChange, confidence } = prediction;

  if (confidence < 0.3) {
    return 'Dados insuficientes para uma previsão precisa.';
  }

  if (trend === 'stable') {
    return 'Seus gastos devem se manter estáveis no próximo mês.';
  }

  if (trend === 'increasing') {
    return `Atenção: Seus gastos podem aumentar em ${Math.abs(percentageChange).toFixed(0)}% no próximo mês.`;
  }

  return `Ótimo! Seus gastos podem diminuir em ${Math.abs(percentageChange).toFixed(0)}% no próximo mês.`;
}
