'use client';

import React from "react"

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Account, Category } from '@/lib/db';

interface AddTransactionDialogProps {
  accounts: Account[];
  categories: Category[];
  trigger?: React.ReactNode;
}

export function AddTransactionDialog({ accounts, categories, trigger }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    type: 'expense',
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    merchant: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: parseInt(formData.accountId),
          amount: parseFloat(formData.amount),
          type: formData.type,
          description: formData.description,
          date: formData.date,
          categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
          merchant: formData.merchant || undefined,
        }),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          accountId: '',
          amount: '',
          type: 'expense',
          description: '',
          date: new Date().toISOString().split('T')[0],
          categoryId: '',
          merchant: '',
        });
        window.location.reload();
      } else {
        alert('Erro ao adicionar transação');
      }
    } catch (error) {
      console.error('[v0] Error adding transaction:', error);
      alert('Erro ao adicionar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Transação</DialogTitle>
          <DialogDescription>
            Registre uma nova receita ou despesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value, categoryId: '' })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conta */}
          <div className="space-y-2">
            <Label htmlFor="account">Conta</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              required
            >
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} ({account.bank_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
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

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              type="text"
              placeholder="Ex: Compra no supermercado"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estabelecimento */}
          <div className="space-y-2">
            <Label htmlFor="merchant">Estabelecimento (Opcional)</Label>
            <Input
              id="merchant"
              type="text"
              placeholder="Ex: Supermercado Pão de Açúcar"
              value={formData.merchant}
              onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
            />
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
