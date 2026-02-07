'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2, Target, TrendingUp } from 'lucide-react';
import { GoalDialog } from '@/components/goal-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Goal } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>(undefined);
  const [progressAmount, setProgressAmount] = useState('');
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const response = await fetch('/api/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar metas',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!selectedGoal) return;

    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: 'Meta excluída com sucesso.',
      });

      setSelectedGoal(undefined); // Fecha o diálogo
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir meta',
      });
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || !progressAmount) return;

    try {
      const response = await fetch(`/api/goals/${selectedGoal.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAmount: parseFloat(progressAmount) }),
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: 'Progresso atualizado com sucesso.',
      });

      setProgressDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao atualizar progresso',
      });
    }
  };

  const calculateProgress = (goal: Goal) => {
    return goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const days = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
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
            <h1 className="text-3xl font-bold">Metas Financeiras</h1>
            <p className="text-muted-foreground">Acompanhe seus objetivos financeiros</p>
          </div>
          <Button onClick={() => { setSelectedGoal(undefined); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma meta criada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Defina metas financeiras para alcançar seus objetivos
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const isComplete = progress >= 100;
              const daysRemaining = getDaysRemaining(goal.target_date ? String(goal.target_date) : null);

              return (
                <Card key={goal.id} className={isComplete ? 'border-green-500' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progresso</span>
                          <span className={isComplete ? 'text-green-600 font-semibold' : ''}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          R$ {goal.current_amount.toFixed(2)}
                        </span>
                        <span className="font-medium">R$ {goal.target_amount.toFixed(2)}</span>
                      </div>

                      {goal.target_date && (
                        <div className="text-sm text-muted-foreground">
                          <span>Prazo: {formatDate(String(goal.target_date))}</span>
                          {daysRemaining !== null && (
                            <span className={`ml-2 ${daysRemaining < 30 ? 'text-orange-600' : ''}`}>
                              ({daysRemaining > 0 ? `${daysRemaining} dias` : 'Vencida'})
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full"
                        variant={isComplete ? 'outline' : 'default'}
                        onClick={() => {
                          setSelectedGoal(goal);
                          setProgressAmount(goal.current_amount.toString());
                          setProgressDialogOpen(true);
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Atualizar Progresso
                      </Button>

                      {isComplete && (
                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                          <Target className="w-4 h-4" />
                          <span>Meta Alcançada! 🎉</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <GoalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          goal={selectedGoal}
          onSuccess={loadData}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Meta?"
          description="Esta ação não pode ser desfeita. A meta será permanentemente excluída."
          onConfirm={handleDelete}
        />

        <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Atualizar Progresso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="progress">Valor Atual (R$)</Label>
                <Input
                  id="progress"
                  type="number"
                  step="0.01"
                  value={progressAmount}
                  onChange={(e) => setProgressAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setProgressDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleUpdateProgress} className="flex-1">
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
