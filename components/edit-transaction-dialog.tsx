'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Account, Category, Transaction as BaseTransaction } from '@/lib/db';

interface Transaction extends Omit<BaseTransaction, 'transaction_date' | 'user_id'> {
  date: string;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  accounts,
  categories,
  onSuccess,
}: EditTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toInputDate = (value?: string) => {
    if (!value) return new Date().toISOString().split('T')[0];
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  };

  const toIsoDate = (value?: string) => {
    if (!value) return new Date().toISOString();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  const [formData, setFormData] = useState({
    description: transaction.description,
    amount: transaction.amount.toString(),
    type: transaction.type,
    categoryId: transaction.category_id,
    accountId: transaction.account_id,
    date: toInputDate(transaction.date),
    notes: transaction.notes || '',
    tags: transaction.tags?.join(', ') || '',
  });

  const filteredCategories = (categories || []).filter((c) => c.type === formData.type);

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        categoryId: transaction.category_id,
        accountId: transaction.account_id,
        date: toInputDate(transaction.date),
        notes: transaction.notes || '',
        tags: transaction.tags?.join(', ') || '',
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount),
          type: formData.type,
          categoryId: formData.categoryId || null,
          accountId: formData.accountId,
          date: toIsoDate(formData.date),
          notes: formData.notes || null,
          tags: formData.tags
            ? formData.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar transação');
      }

      toast({
        title: 'Sucesso!',
        description: 'Transação atualizada com sucesso.',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar transação',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription>
            Atualize os detalhes desta transação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Compra no supermercado"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') =>
                  setFormData({ ...formData, type: value, categoryId: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {(filteredCategories || []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta *</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(accounts || []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              placeholder="Ex: urgente, trabalho, pessoal"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
