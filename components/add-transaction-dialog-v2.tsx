'use client';

import React, { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import type { Account, Category } from '@/lib/db';

interface AddTransactionDialogProps {
  accounts?: Account[];
  categories?: Category[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddTransactionDialogV2({
  accounts: propAccounts,
  categories: propCategories,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  const { toast } = useToast();

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [formData, setFormData] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch accounts and categories if not provided as props
  useEffect(() => {
    if (open && (!propAccounts || !propCategories)) {
      setDataLoading(true);
      Promise.all([
        !propAccounts ? fetch('/api/accounts').then(r => r.json()) : Promise.resolve({ accounts: propAccounts }),
        !propCategories ? fetch('/api/categories').then(r => r.json()) : Promise.resolve({ categories: propCategories }),
      ])
        .then(([accData, catData]) => {
          if (!propAccounts) setAccounts(accData.accounts || []);
          if (!propCategories) setCategories(catData.categories || []);
        })
        .catch(err => {
          console.error('Error loading data:', err);
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Erro ao carregar contas e categorias',
          });
        })
        .finally(() => setDataLoading(false));
    }
  }, [open, propAccounts, propCategories, toast]);

  // Update internal state if props change
  useEffect(() => {
    if (propAccounts) setAccounts(propAccounts);
  }, [propAccounts]);

  useEffect(() => {
    if (propCategories) setCategories(propCategories);
  }, [propCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          transactionDate: new Date(formData.transactionDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar transação');
      }

      toast({
        title: 'Sucesso!',
        description: 'Transação adicionada com sucesso.',
      });

      setOpen(false);
      setFormData({
        accountId: '',
        categoryId: '',
        amount: '',
        type: 'expense',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: '',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar transação',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = (categories || []).filter((c) => c.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Transação</DialogTitle>
          <DialogDescription>
            Registre uma nova movimentação financeira
          </DialogDescription>
        </DialogHeader>
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <form onSubmit={handleSubmit}>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
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
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Almoço, Salário..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="account">Conta</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
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

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.transactionDate}
                onChange={(e) =>
                  setFormData({ ...formData, transactionDate: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
