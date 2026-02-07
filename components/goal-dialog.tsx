'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Goal } from '@/lib/db';

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
  onSuccess?: () => void;
}

export function GoalDialog({ open, onOpenChange, goal, onSuccess }: GoalDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: '',
        targetAmount: goal.target_amount.toString(),
        currentAmount: goal.current_amount.toString(),
        deadline: goal.target_date ? new Date(goal.target_date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        targetAmount: '',
        currentAmount: '0',
        deadline: '',
      });
    }
  }, [goal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = goal ? `/api/goals/${goal.id}` : '/api/goals';
      const method = goal ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar meta');
      }

      toast({
        title: 'Sucesso!',
        description: goal ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar meta',
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = formData.targetAmount
    ? (parseFloat(formData.currentAmount || '0') / parseFloat(formData.targetAmount)) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar Meta' : 'Nova Meta Financeira'}</DialogTitle>
          <DialogDescription>
            {goal ? 'Atualize as informações da sua meta financeira.' : 'Defina uma nova meta para alcançar seus objetivos financeiros.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              placeholder="Ex: Viagem para Europa"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua meta..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Valor Alvo (R$) *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentAmount">Valor Atual (R$) *</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo (opcional)</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          {formData.targetAmount && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>R$ {parseFloat(formData.currentAmount || '0').toFixed(2)}</span>
                <span>R$ {parseFloat(formData.targetAmount).toFixed(2)}</span>
              </div>
            </div>
          )}

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
