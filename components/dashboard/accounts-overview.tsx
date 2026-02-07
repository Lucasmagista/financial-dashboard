import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils-finance';
import { Account } from '@/lib/db';
import { Wallet, CreditCard, PiggyBank, TrendingUp, Building } from 'lucide-react';

interface AccountsOverviewProps {
  accounts: Account[];
}

const accountIcons: Record<string, typeof Wallet> = {
  checking: Wallet,
  savings: PiggyBank,
  investment: TrendingUp,
  credit_card: CreditCard,
  other: Wallet
};

const accountLabels: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
  credit_card: 'Cartão de Crédito',
  other: 'Outra'
};

export function AccountsOverview({ accounts }: AccountsOverviewProps) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Suas Contas</h3>
        <p className="text-sm text-muted-foreground">{accounts.length} conta(s) conectada(s)</p>
      </div>
      <div className="space-y-4">
        {accounts.map((account) => {
          const Icon = accountIcons[account.account_type];
          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{account.name}</p>
                    {account.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Ativa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {accountLabels[account.account_type]}
                    </p>
                    {account.bank_name && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {formatCurrency(account.balance, account.currency)}
                </p>
                {account.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizado {new Date(account.last_sync_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
