'use client';

import { Card } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils-finance';

interface IncomeExpenseChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const formattedData = data.map(item => ({
    month: item.month,
    Receitas: Number(item.income),
    Despesas: Number(item.expenses)
  }));

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Receitas vs Despesas</h3>
        <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="Receitas" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Despesas" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
