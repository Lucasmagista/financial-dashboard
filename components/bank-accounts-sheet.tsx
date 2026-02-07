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
import {
  Building2,
  Pencil,
  Trash2,
  Plus,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { Account } from '@/lib/db';
import { BankLogo } from '@/components/bank-logo';
import { AccountDialog } from '@/components/account-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface BankGroup {
  bankName: string;
  bankCode?: string;
  accounts: Account[];
  totalBalance: number;
  accountCount: number;
}

interface BankAccountsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank: BankGroup | null;
  showBalances: boolean;
  onUpdate: () => void;
}

export function BankAccountsSheet({
  open,
  onOpenChange,
  bank,
  showBalances,
  onUpdate,
}: BankAccountsSheetProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!selectedAccount) return;

    // Optimistic update - atualiza UI imediatamente
    const accountName = selectedAccount.name;
    setDeleteDialogOpen(false);
    setSelectedAccount(undefined);

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: `${accountName} excluída com sucesso.`,
      });

      // Atualiza dados em background
      onUpdate();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir conta',
      });
      // Em caso de erro, recarrega para reverter
      onUpdate();
    }
  };

  const getAccountTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      credit_card: 'Cartão de Crédito',
      investment: 'Investimento',
      other: 'Outro',
    };
    return labels[type] || type;
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      checking: <Building2 className="w-5 h-5" />,
      savings: <PiggyBank className="w-5 h-5" />,
      credit_card: <CreditCard className="w-5 h-5" />,
      investment: <TrendingUp className="w-5 h-5" />,
      other: <Wallet className="w-5 h-5" />,
    };
    return icons[type] || icons.other;
  };

  // Para adicionar nova conta ao banco existente
  const handleAddAccountToBank = () => {
    setSelectedAccount(undefined);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedAccount(undefined);
    onUpdate();
    // Auto-close sheet se não houver mais contas
    setTimeout(() => {
      if (bank && bank.accounts.length <= 1) {
        onOpenChange(false);
      }
    }, 500);
  };

  if (!bank && !open) return null;

  const accountsByType = bank ? {
    checking: bank.accounts.filter(a => a.account_type === 'checking'),
    savings: bank.accounts.filter(a => a.account_type === 'savings'),
    credit_card: bank.accounts.filter(a => a.account_type === 'credit_card'),
    investment: bank.accounts.filter(a => a.account_type === 'investment'),
    other: bank.accounts.filter(a => a.account_type === 'other'),
  } : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {bank ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  {bank.bankCode ? (
                    <BankLogo 
                      bankCode={bank.bankCode}
                      bankName={bank.bankName}
                      size={64}
                      className="rounded-xl"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">{bank.bankName}</SheetTitle>
                    <SheetDescription>
                      {bank.accountCount} {bank.accountCount === 1 ? 'conta cadastrada' : 'contas cadastradas'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Saldo Total
                        </p>
                        <p className={`text-3xl font-bold ${bank.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {showBalances ? `R$ ${Math.abs(bank.totalBalance).toFixed(2)}` : '••••••'}
                        </p>
                      </div>
                      <Button onClick={handleAddAccountToBank}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Conta
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Accounts by Type */}
                {accountsByType && (
                  <div className="space-y-6">
                    {Object.entries(accountsByType).map(([type, accounts]) => {
                      if (accounts.length === 0) return null;
                      
                      return (
                        <div key={type} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {getAccountTypeLabel(type)}
                            </h3>
                            <Badge variant="secondary">{accounts.length}</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            {accounts.map((account) => {
                              const isCredit = account.account_type === 'credit_card';
                              const isNegative = account.balance < 0;
                              const balanceColor = isNegative ? 'text-red-600' : 'text-green-600';

                              return (
                                <Card key={account.id} className="hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div
                                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                                          style={{ backgroundColor: account.color || '#3b82f6' }}
                                        >
                                          {getAccountIcon(account.account_type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold truncate">{account.name}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <p className={`text-sm font-medium ${balanceColor}`}>
                                              {showBalances ? `R$ ${Math.abs(account.balance).toFixed(2)}` : '••••••'}
                                            </p>
                                            {!account.is_active && (
                                              <Badge variant="outline" className="text-xs">
                                                Inativa
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex gap-1">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedAccount(account);
                                            setDialogOpen(true);
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedAccount(account);
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl">Nova Conta</SheetTitle>
                <SheetDescription>
                  Adicione uma nova conta bancária ou cartão de crédito
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6">
                <Card className="p-8 text-center">
                  <div className="rounded-full bg-primary/10 p-6 w-fit mx-auto mb-4">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Criar Nova Conta</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Preencha os detalhes da sua conta bancária ou cartão
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    Começar
                  </Button>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        onSuccess={handleSuccess}
        defaultBankName={bank?.bankName}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Conta?"
        description={`Tem certeza que deseja excluir a conta "${selectedAccount?.name}"? Esta ação não pode ser desfeita e todas as transações associadas também serão excluídas.`}
        onConfirm={handleDelete}
      />
    </>
  );
}
