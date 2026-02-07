import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculatePercentage } from '@/lib/utils-finance';
import { Goal } from '@/lib/db';
import { Target, TrendingUp } from 'lucide-react';

interface GoalsOverviewProps {
  goals: Goal[];
}

export function GoalsOverview({ goals }: GoalsOverviewProps) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Metas Financeiras</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso dos seus objetivos
        </p>
      </div>
      <div className="space-y-6">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const current = Number(goal.current_amount);
            const target = Number(goal.target_amount);
            const percentage = calculatePercentage(current, target);
            const remaining = target - current;
            const isCompleted = current >= target;

            return (
              <div key={goal.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {isCompleted ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{goal.name}</p>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <Badge className="bg-green-600">Concluída</Badge>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      {formatCurrency(current)} de {formatCurrency(target)}
                    </span>
                    <span className="font-medium text-primary">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2" />
                  {!isCompleted && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Faltam {formatCurrency(remaining)} para atingir sua meta
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-green-600 mt-2">
                      Meta atingida! Você conseguiu! 🎉
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-3">
              <Target className="h-6 w-6" />
            </div>
            <p>Nenhuma meta definida</p>
            <p className="text-xs mt-1">Crie metas para alcançar seus objetivos financeiros</p>
          </div>
        )}
      </div>
    </Card>
  );
}
