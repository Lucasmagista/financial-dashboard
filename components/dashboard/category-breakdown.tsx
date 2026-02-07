'use client';

import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils-finance';

interface CategoryBreakdownProps {
  data: Array<{
    name: string;
    total: number;
    color?: string;
  }>;
  title?: string;
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function CategoryBreakdown({ data, title = 'Gastos por Categoria' }: CategoryBreakdownProps) {
  const chartData = data.map((item, index) => ({
    name: item.name || 'Sem Categoria',
    value: Number(item.total),
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
      </div>
      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-6 space-y-3">
            {chartData.map((item, index) => {
              const percentage = (item.value / total) * 100;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCurrency(item.value)}</div>
                    <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível
        </div>
      )}
    </Card>
  );
}
