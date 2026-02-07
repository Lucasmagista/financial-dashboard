'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Car,
  CreditCard,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  LineChart,
  PiggyBank,
  Repeat,
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils-finance';
import { BankLogo } from '@/components/bank-logo';
import { TransactionSheet } from '@/components/transaction-sheet';
import type { Transaction as BaseTransaction } from '@/lib/db';


interface Transaction extends Omit<BaseTransaction, 'transaction_date' | 'user_id'> {
  transaction_date: string;
  date: string;
  category_name?: string;
  account_name?: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  account_type: 'checking' | 'savings' | 'investment' | 'credit_card' | 'other';
  bank_name?: string;
  bank_code?: string;
  currency: string;
  is_active: boolean;
  color?: string;
}

const ACCOUNT_TYPE_ICONS: Record<Account['account_type'], LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: LineChart,
  other: Building2,
};

const ACCOUNT_TYPE_LABELS: Record<Account['account_type'], string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  investment: 'Investimento',
  other: 'Outro',
};

interface AccountGroup {
  account: Account;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

interface AccountTransactionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountGroup: AccountGroup | null;
  onUpdate: () => void;
}

export function AccountTransactionsSheet({
  open,
  onOpenChange,
  accountGroup,
  onUpdate,
}: AccountTransactionsSheetProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setTransactionSheetOpen(true);
  };

  const getBankCode = (bankName?: string): string | undefined => {
    if (!bankName) return undefined;
    
    const bankMap: Record<string, string> = {
      'Nubank': '0260',
      'Inter': '0077',
      'Itaú': '0341',
      'Bradesco': '0237',
      'Banco do Brasil': '0001',
      'Santander': '0033',
      'Caixa': '0104',
      'BTG Pactual': '0208',
      'C6 Bank': '0336',
      'Neon': '0655',
      'PagBank': '0290',
      'Mercado Pago': '0323',
      'PicPay': '0380',
      'Original': '0212',
      'Safra': '0422',
    };
    
    return bankMap[bankName];
  };

  const getCategoryIcon = (categoryName?: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
      'Alimentação': ShoppingBag,
      'Transporte': Car,
      'Moradia': Home,
      'Saúde': HeartPulse,
      'Educação': GraduationCap,
      'Lazer': Gamepad2,
      'Compras': ShoppingBag,
      'Salário': PiggyBank,
      'Investimentos': LineChart,
      'Freelance': BriefcaseBusiness,
      'Outros': Tag,
    };
    return (categoryName && icons[categoryName]) || Tag;
  };

  if (!accountGroup) return null;

  const { account, transactions, totalIncome, totalExpense, transactionCount } = accountGroup;
  const isCredit = account.account_type === 'credit_card';
  const balance = totalIncome - totalExpense;
  const bankCode = getBankCode(account.bank_name);
  
  // Para cartões de crédito
  const creditLimit = isCredit ? 5000 : 0; // TODO: Pegar do banco de dados
  const availableCredit = isCredit ? creditLimit - Math.abs(account.balance) : 0;
  const creditUsagePercent = isCredit ? (Math.abs(account.balance) / creditLimit) * 100 : 0;

  // Ordenar transações por data (mais recentes primeiro)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date || a.transaction_date);
    const dateB = new Date(b.date || b.transaction_date);
    return dateB.getTime() - dateA.getTime();
  });

  const AccountIcon = ACCOUNT_TYPE_ICONS[account.account_type] || Wallet;
  const accountTypeLabel = ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-background">
          <SheetHeader className="pb-5 mb-6 border-b border-border/70">
            <div className="flex items-center gap-3">
              {bankCode && (
                <BankLogo
                  bankCode={bankCode}
                  bankName={account.bank_name || ''}
                  size={48}
                  className="rounded-lg"
                />
              )}
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold truncate">{account.name}</SheetTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                  <span className="inline-flex items-center gap-1">
                    <AccountIcon className="h-4 w-4" />
                    {accountTypeLabel}
                  </span>
                  {account.bank_name && <span>• {account.bank_name}</span>}
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {transactionCount} transações
                  </span>
                </div>
                <SheetDescription className="sr-only" id="account-transactions-desc">
                  Detalhes da conta e transações recentes.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Destaque de saldo */}
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/60 to-background p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{isCredit ? 'Fatura atual' : 'Saldo'}</p>
                  <p className={`text-3xl font-bold ${account.balance < 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {formatCurrency(Math.abs(account.balance))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Atualizado em tempo real</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="rounded-xl bg-muted px-3 py-2 min-w-[120px]">
                    <p className="text-[11px] text-muted-foreground">Receitas</p>
                    <p className="text-lg font-semibold text-green-500">{formatCurrency(totalIncome)}</p>
                  </div>
                  <div className="rounded-xl bg-muted px-3 py-2 min-w-[120px]">
                    <p className="text-[11px] text-muted-foreground">Despesas</p>
                    <p className="text-lg font-semibold text-red-500">{formatCurrency(totalExpense)}</p>
                  </div>
                </div>
              </div>

              {isCredit && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Limite total {formatCurrency(creditLimit)}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                    <span>Disponível {formatCurrency(availableCredit)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resumo compacto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                  Receitas
                </p>
                <p className="text-xl font-semibold text-green-500">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  Despesas
                </p>
                <p className="text-xl font-semibold text-red-500">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Saldo do período
                </p>
                <p className={`text-xl font-semibold ${balance < 0 ? 'text-red-500' : 'text-foreground'}`}>
                  {balance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(balance))}
                </p>
              </div>
            </div>

            {/* Lista de transações em linha do tempo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Transações</h3>
                <span className="text-xs text-muted-foreground">{transactionCount}</span>
              </div>

              {sortedTransactions.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma transação neste período</div>
              ) : (
                <div className="relative pl-4">
                  <div className="absolute left-1 top-0 bottom-0 w-px bg-border" aria-hidden />
                  <div className="space-y-2">
                    {sortedTransactions.map((transaction) => {
                      const CategoryIcon = getCategoryIcon(transaction.category_name);
                      const isExpense = transaction.type === 'expense';
                      const amount = Math.abs(Number(transaction.amount));
                      const dateLabel = new Date(transaction.date || transaction.transaction_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <button
                          key={transaction.id}
                          className="w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          onClick={() => handleTransactionClick(transaction)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative mt-1">
                              <span className={`absolute -left-3 top-1.5 h-2.5 w-2.5 rounded-full ${isExpense ? 'bg-red-500' : 'bg-green-500'}`} aria-hidden />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{transaction.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {dateLabel}
                                    </span>
                                    {transaction.category_name && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        <CategoryIcon className="h-3 w-3" />
                                        {transaction.category_name}
                                      </span>
                                    )}
                                    {transaction.is_recurring && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        <Repeat className="h-3 w-3" />
                                        Recorrente
                                      </span>
                                    )}
                                    {transaction.status && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground uppercase">
                                        {transaction.status}
                                      </span>
                                    )}
                                    {transaction.payment_method && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground uppercase">
                                        {transaction.payment_method}
                                      </span>
                                    )}
                                    {transaction.mcc && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                        MCC {transaction.mcc}
                                      </span>
                                    )}
                                    {transaction.merchant && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground truncate max-w-[160px]">
                                        <Store className="h-3 w-3" />
                                        {transaction.merchant}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className={`text-sm font-semibold ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
                                  {isExpense ? '-' : '+'} {formatCurrency(amount)}
                                </p>
                              </div>

                              {transaction.notes && (
                                <p className="text-xs text-muted-foreground line-clamp-2 inline-flex items-start gap-1">
                                  <FileText className="mt-[1px] h-3 w-3 flex-shrink-0" />
                                  <span className="line-clamp-2">{transaction.notes}</span>
                                </p>
                              )}
                              {transaction.tags && transaction.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {transaction.tags.slice(0, 6).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                                      {tag.replace(/-/g, ' ')}
                                    </Badge>
                                  ))}
                                  {transaction.tags.length > 6 && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">+{transaction.tags.length - 6}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <TransactionSheet
        open={transactionSheetOpen}
        onOpenChange={setTransactionSheetOpen}
        transaction={selectedTransaction}
        onUpdate={onUpdate}
        onDelete={() => {
          setTransactionSheetOpen(false);
          onUpdate();
        }}
      />
    </>
  );
}
