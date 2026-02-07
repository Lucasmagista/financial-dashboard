import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateShort } from '@/lib/utils-finance';
import { Transaction } from '@/lib/db';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Transações Recentes</h3>
          <p className="text-sm text-muted-foreground">Últimas movimentações</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/transactions">Ver todas</Link>
        </Button>
      </div>
      <div className="space-y-4">
        {transactions.length > 0 ? (
          transactions.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full p-2 ${
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDateShort(transaction.transaction_date)}
                    </p>
                    {transaction.category_name && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category_name}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>
                {transaction.account_name && (
                  <p className="text-xs text-muted-foreground mt-1">{transaction.account_name}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        )}
      </div>
    </Card>
  );
}
