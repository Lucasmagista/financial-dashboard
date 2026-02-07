import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  TrendingDown,
  Target,
  RefreshCw,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import type { Alert } from '@/lib/alerts';

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertIcons = {
  budget: TrendingDown,
  unusual: AlertTriangle,
  goal: Target,
  recurring: RefreshCw,
  balance: Wallet,
};

const severityColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Tudo em Ordem!</h3>
          <p className="text-sm text-muted-foreground">
            Não há alertas no momento. Continue assim!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Alertas e Notificações</h3>
        <p className="text-sm text-muted-foreground">
          {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} requer
          {alerts.length === 1 ? '' : 'em'} sua atenção
        </p>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const Icon = alertIcons[alert.type];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div
                className={`p-2 rounded-lg ${
                  alert.severity === 'high'
                    ? 'bg-destructive/10'
                    : alert.severity === 'medium'
                      ? 'bg-orange-500/10'
                      : 'bg-primary/10'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    alert.severity === 'high'
                      ? 'text-destructive'
                      : alert.severity === 'medium'
                        ? 'text-orange-500'
                        : 'text-primary'
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{alert.title}</h4>
                  <Badge variant={severityColors[alert.severity]} className="text-xs">
                    {alert.severity === 'high'
                      ? 'Urgente'
                      : alert.severity === 'medium'
                        ? 'Atenção'
                        : 'Info'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>

              {alert.actionUrl && (
                <Link href={alert.actionUrl}>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {alerts.length > 5 && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/alerts">
              Ver todos os {alerts.length} alertas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
