'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { CategoryDialog } from '@/components/category-dialog';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar categorias',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast({
        title: 'Sucesso!',
        description: 'Categoria excluída com sucesso.',
      });

      setSelectedCategory(null); // Fecha o diálogo
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir categoria',
      });
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  const CategoryGrid = ({ items }: { items: Category[] }) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma categoria</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie categorias para organizar suas transações
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Categoria
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: category.color || '#3b82f6' }}
                >
                  {category.icon}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategory(category);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategory(category);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-base">{category.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {category.type === 'income' ? 'Receita' : 'Despesa'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
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
            <h1 className="text-3xl font-bold">Categorias</h1>
            <p className="text-muted-foreground">Organize suas transações por categoria</p>
          </div>
          <Button onClick={() => { setSelectedCategory(undefined); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="expense">
              Despesas ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income">
              Receitas ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expense" className="mt-6">
            <CategoryGrid items={expenseCategories} />
          </TabsContent>

          <TabsContent value="income" className="mt-6">
            <CategoryGrid items={incomeCategories} />
          </TabsContent>
        </Tabs>

        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={selectedCategory}
          onSuccess={loadData}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Categoria?"
          description="Esta ação não pode ser desfeita. As transações com esta categoria ficarão sem categoria."
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
