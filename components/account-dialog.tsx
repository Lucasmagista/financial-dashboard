'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Account } from '@/lib/db';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSuccess?: () => void;
  defaultBankName?: string;
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'credit', label: 'Cartão de Crédito' },
  { value: 'investment', label: 'Investimento' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
];

const COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
  { value: '#84cc16', label: 'Lima' },
];

export function AccountDialog({ open, onOpenChange, account, onSuccess, defaultBankName }: AccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'BRL',
    bankName: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.account_type,
        balance: account.balance.toString(),
        currency: account.currency || 'BRL',
        bankName: account.bank_name || '',
        color: account.color || '#3b82f6',
      });
    } else {
      setFormData({
        name: '',
        type: 'checking',
        balance: '0',
        currency: 'BRL',
        bankName: defaultBankName || '',
        color: '#3b82f6',
      });
    }
  }, [account, open, defaultBankName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = account ? `/api/accounts/${account.id}` : '/api/accounts';
      const method = account ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          accountType: formData.type, // For PATCH compatibility
          balance: parseFloat(formData.balance),
          currency: formData.currency,
          bankName: formData.bankName || null,
          color: formData.color,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar conta');
      }

      toast({
        title: 'Sucesso!',
        description: account ? 'Conta atualizada!' : 'Conta criada!',
      });

      // Fecha o dialog imediatamente para feedback rápido
      onOpenChange(false);
      setLoading(false);
      
      // Chama onSuccess em background
      if (onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
    } catch (error) {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar conta',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          <DialogDescription>
            {account ? 'Atualize as informações desta conta.' : 'Adicione uma nova conta bancária ou carteira.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial (R$) *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Instituição (opcional)</Label>
            <Input
              id="bankName"
              placeholder="Ex: Banco do Brasil"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    formData.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  title={color.label}
                />
              ))}
            </div>
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
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
