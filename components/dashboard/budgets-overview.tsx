import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculatePercentage } from '@/lib/utils-finance';
import { Budget } from '@/lib/db';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface BudgetsOverviewProps {
  budgets: Budget[];
}

export function BudgetsOverview({ budgets }: BudgetsOverviewProps) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Orçamentos</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe seus limites de gastos
        </p>
      </div>
      <div className="space-y-6">
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const spent = Number(budget.spent) || 0;
            const total = Number(budget.amount);
            const percentage = calculatePercentage(spent, total);
            const isOverBudget = spent > total;
            const isNearLimit = percentage >= 80 && !isOverBudget;

            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{budget.category_name}</span>
                    {isOverBudget && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {!isOverBudget && percentage === 0 && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <Badge variant={budget.period === 'monthly' ? 'default' : 'secondary'}>
                    {budget.period === 'monthly' ? 'Mensal' : 
                     budget.period === 'weekly' ? 'Semanal' : 'Anual'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className={isOverBudget ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {formatCurrency(spent)} de {formatCurrency(total)}
                  </span>
                  <span className={`font-medium ${
                    isOverBudget ? 'text-destructive' : 
                    isNearLimit ? 'text-yellow-600' : 
                    'text-muted-foreground'
                  }`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={`h-2 ${
                    isOverBudget ? '[&>div]:bg-destructive' : 
                    isNearLimit ? '[&>div]:bg-yellow-500' : ''
                  }`}
                />
                {isOverBudget && (
                  <p className="text-xs text-destructive">
                    Você ultrapassou o orçamento em {formatCurrency(spent - total)}
                  </p>
                )}
                {isNearLimit && (
                  <p className="text-xs text-yellow-600">
                    Você está próximo do limite ({formatCurrency(total - spent)} restantes)
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum orçamento definido</p>
            <p className="text-xs mt-1">Crie orçamentos para controlar seus gastos</p>
          </div>
        )}
      </div>
    </Card>
  );
}
