'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { BudgetDialog } from '@/components/budget-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Budget, Category } from '@/lib/db';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>(undefined);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/categories'),
      ]);

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar orçamentos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!selectedBudget) return;

    try {
      const response = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: 'Orçamento excluído com sucesso.',
      });

      setSelectedBudget(null); // Fecha o diálogo
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir orçamento',
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : 'Sem categoria';
  };

  const calculateProgress = (budget: Budget) => {
    return budget.amount > 0 ? ((budget.spent ?? 0) / budget.amount) * 100 : 0;
  };

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
      yearly: 'Anual',
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie seus limites de gastos</p>
          </div>
          <Button onClick={() => { setSelectedBudget(undefined); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum orçamento criado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie orçamentos para controlar melhor seus gastos
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const progress = calculateProgress(budget);
              const isOverBudget = progress > 100;
              const isWarning = progress > 80 && progress <= 100;

              return (
                <Card key={budget.id} className={isOverBudget ? 'border-destructive' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{budget.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getCategoryName(budget.category_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getPeriodLabel(budget.period)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBudget(budget);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBudget(budget);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Gasto</span>
                          <span className={isOverBudget ? 'text-destructive font-semibold' : ''}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(progress, 100)}
                          className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          R$ {(budget.spent ?? 0).toFixed(2)}
                        </span>
                        <span className="font-medium">R$ {budget.amount.toFixed(2)}</span>
                      </div>
                      {isOverBudget && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <TrendingUp className="w-4 h-4" />
                          <span>Limite ultrapassado em R$ {((budget.spent ?? 0) - budget.amount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          categories={categories}
          budget={selectedBudget}
          onSuccess={loadData}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Orçamento?"
          description="Esta ação não pode ser desfeita. O orçamento será permanentemente excluído."
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
