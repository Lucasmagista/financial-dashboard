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
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Car,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  LineChart,
  Pencil,
  PiggyBank,
  Repeat,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils-finance';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Account, Category } from '@/lib/db';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string;
  category_name?: string;
  account_id: string;
  account_name?: string;
  bank_name?: string;
  date: string;
  transaction_date: string;
  is_recurring?: boolean;
  merchant?: string;
  notes?: string;
  tags?: string[];
  status?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  mcc?: string | null;
  provider_code?: string | null;
}

interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onUpdate: () => void;
  onDelete: () => void;
  accounts?: Account[];
  categories?: Category[];
}

export function TransactionSheet({
  open,
  onOpenChange,
  transaction,
  onUpdate,
  onDelete,
  accounts = [],
  categories = [],
}: TransactionSheetProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!transaction) return;

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: 'Transação excluída com sucesso.',
      });

      setDeleteDialogOpen(false);
      onDelete();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir transação',
      });
    }
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

  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const amount = Math.abs(Number(transaction.amount));
  const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
  const CategoryIcon = getCategoryIcon(transaction.category_name);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <CategoryIcon className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-xl">{transaction.description}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 text-sm">
                    <CategoryIcon className="h-4 w-4" />
                    {transaction.category_name || 'Sem categoria'}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Amount Card */}
            <Card className={`border-l-4 ${isExpense ? 'border-l-red-500' : 'border-l-green-500'}`}>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {isExpense ? 'Valor da Despesa' : 'Valor da Receita'}
                  </p>
                  <p className={`text-4xl font-bold ${amountColor}`}>
                    {isExpense ? '-' : '+'} {formatCurrency(amount)}
                  </p>
                  <Badge variant={isExpense ? 'destructive' : 'default'} className="mt-2">
                    {isExpense ? 'Despesa' : 'Receita'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Detalhes</h3>
              
              <div className="space-y-3">
                {transaction.transaction_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Data</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {transaction.account_name && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Conta</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.account_name}
                        {transaction.bank_name && ` - ${transaction.bank_name}`}
                      </p>
                    </div>
                  </div>
                )}

                {transaction.category_name && (
                  <div className="flex items-start gap-3">
                    <CategoryIcon className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Categoria</p>
                      <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                        <CategoryIcon className="h-4 w-4" />
                        {transaction.category_name}
                      </p>
                    </div>
                  </div>
                )}

                {transaction.merchant && (
                  <div className="flex items-start gap-3">
                    <Store className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Estabelecimento</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.merchant}
                      </p>
                    </div>
                  </div>
                )}

                {(transaction.status || transaction.payment_method || transaction.mcc || transaction.reference_number || transaction.provider_code) && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium">Dados do banco</p>
                      <div className="flex flex-wrap gap-2">
                        {transaction.status && (
                          <Badge variant="outline" className="uppercase text-[11px]">{transaction.status}</Badge>
                        )}
                        {transaction.payment_method && (
                          <Badge variant="secondary" className="uppercase text-[11px]">{transaction.payment_method}</Badge>
                        )}
                        {transaction.mcc && (
                          <Badge variant="outline" className="text-[11px]">MCC {transaction.mcc}</Badge>
                        )}
                        {transaction.reference_number && (
                          <Badge variant="secondary" className="text-[11px]">Ref {transaction.reference_number}</Badge>
                        )}
                        {transaction.provider_code && (
                          <Badge variant="outline" className="text-[11px]">Prov. {transaction.provider_code}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {transaction.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Observações</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.notes}
                      </p>
                    </div>
                  </div>
                )}

                {transaction.is_recurring && (
                  <div className="flex items-start gap-3">
                    <Repeat className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Recorrente</p>
                      <Badge variant="outline" className="inline-flex items-center gap-1">
                        <BadgeDollarSign className="h-3 w-3" />
                        Transação recorrente
                      </Badge>
                    </div>
                  </div>
                )}

                {transaction.tags && transaction.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {transaction.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditDialogOpen(true);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <EditTransactionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        transaction={transaction}
        accounts={accounts}
        categories={categories}
        onSuccess={() => {
          setEditDialogOpen(false);
          onUpdate();
        }}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Transação?"
        description={`Tem certeza que deseja excluir "${transaction.description}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />
    </>
  );
}
