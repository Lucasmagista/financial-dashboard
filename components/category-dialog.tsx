'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/lib/db';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  onSuccess?: () => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#6366f1', '#14b8a6', '#f97316', '#dc2626', '#a855f7', '#db2777', '#0ea5e9', '#65a30d',
];

const ICONS = [
  '🍔', '🚗', '🏠', '💊', '🎓', '🎮', '👕', '✈️',
  '📱', '💰', '🎬', '🏋️', '🎨', '📚', '🛒', '☕',
  '🎵', '💼', '🏥', '⚡', '🌟', '🎁', '🔧', '📦',
];

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '🏷️',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        icon: category.icon || '🏷️',
        color: category.color || '#3b82f6',
      });
    } else {
      setFormData({
        name: '',
        type: 'expense',
        icon: '🏷️',
        color: '#3b82f6',
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories';
      const method = category ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          icon: formData.icon,
          color: formData.color,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar categoria');
      }

      toast({
        title: 'Sucesso!',
        description: category ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar categoria',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>
            {category ? 'Atualize as informações desta categoria.' : 'Crie uma nova categoria para organizar suas transações.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              placeholder="Ex: Alimentação"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
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

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg max-h-[200px] overflow-y-auto">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`text-2xl p-2 rounded border-2 transition-all hover:scale-110 ${
                    formData.icon === icon ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted'
                  }`}
                  onClick={() => setFormData({ ...formData, icon })}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: formData.color }}
            >
              {formData.icon}
            </div>
            <div>
              <p className="font-medium">{formData.name || 'Nome da categoria'}</p>
              <p className="text-sm text-muted-foreground">
                {formData.type === 'income' ? 'Receita' : 'Despesa'}
              </p>
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
