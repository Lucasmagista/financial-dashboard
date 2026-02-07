import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import type { Prediction } from '@/lib/predictions';
import { formatCurrency } from '@/lib/utils-finance';

interface PredictionsCardProps {
  prediction: Prediction;
}

export function PredictionsCard({ prediction }: PredictionsCardProps) {
  const { predicted, confidence, trend, percentageChange } = prediction;

  const TrendIcon =
    trend === 'increasing'
      ? TrendingUp
      : trend === 'decreasing'
        ? TrendingDown
        : Minus;

  const trendColor =
    trend === 'increasing'
      ? 'text-orange-500'
      : trend === 'decreasing'
        ? 'text-green-500'
        : 'text-muted-foreground';

  const confidenceLabel =
    confidence >= 0.7 ? 'Alta' : confidence >= 0.4 ? 'Média' : 'Baixa';
  
  const confidenceColor =
    confidence >= 0.7 ? 'default' : confidence >= 0.4 ? 'secondary' : 'outline';

  if (confidence < 0.3) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Previsão para Próximo Mês</h3>
            <p className="text-sm text-muted-foreground">
              Dados insuficientes para gerar uma previsão precisa. Continue
              registrando suas transações.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Previsão para Próximo Mês</h3>
            <p className="text-sm text-muted-foreground">
              Baseado nos últimos 6 meses
            </p>
          </div>
        </div>
        <Badge variant={confidenceColor as any}>
          Confiança: {confidenceLabel}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Gastos Previstos
          </p>
          <p className="text-3xl font-bold">{formatCurrency(predicted)}</p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          <div>
            <p className={`font-medium ${trendColor}`}>
              {trend === 'increasing'
                ? 'Tendência de Aumento'
                : trend === 'decreasing'
                  ? 'Tendência de Redução'
                  : 'Mantendo Estável'}
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.abs(percentageChange).toFixed(1)}% em relação à média
            </p>
          </div>
        </div>

        {trend === 'increasing' && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              <strong>Dica:</strong> Seus gastos estão aumentando. Revise seu
              orçamento e considere cortar despesas não essenciais.
            </p>
          </div>
        )}

        {trend === 'decreasing' && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400">
              <strong>Parabéns!</strong> Você está reduzindo seus gastos.
              Continue assim!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
