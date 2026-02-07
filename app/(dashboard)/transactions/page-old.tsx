'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils-finance';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Plus, 
  Search, 
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AddTransactionDialogV2 } from '@/components/add-transaction-dialog-v2';
import { TransactionSheet } from '@/components/transaction-sheet';
import { useToast } from '@/hooks/use-toast';

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
  transaction_date: string;
  is_recurring?: boolean;
  merchant?: string;
  notes?: string;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  bank_name?: string;
}

interface Filters {
  type: string;
  categoryId: string;
  accountId: string;
  search: string;
  period: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    categoryId: 'all',
    accountId: 'all',
    search: '',
    period: '30'
  });
  const { toast } = useToast();

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const params = new URLSearchParams();
      params.append('limit', '500');
      
      // Calcular período
      if (filters.period !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(filters.period));
        params.append('start_date', startDate.toISOString().split('T')[0]);
        params.append('end_date', endDate.toISOString().split('T')[0]);
      }
      
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.categoryId !== 'all') params.append('category_id', filters.categoryId);
      if (filters.accountId !== 'all') params.append('account_id', filters.accountId);
      if (filters.search) params.append('search', filters.search);

      const [txRes, catRes, accRes] = await Promise.all([
        fetch(`/api/transactions?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/accounts', { cache: 'no-store' }),
      ]);

      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar dados',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filters]);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSheetOpen(true);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      search: '',
      period: '30'
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.type !== 'all' ||
      filters.categoryId !== 'all' ||
      filters.accountId !== 'all' ||
      filters.search !== '' ||
      filters.period !== '30'
    );
  }, [filters]);

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    return { 
      income, 
      expense, 
      balance: income - expense,
      incomeCount: transactions.filter(t => t.type === 'income').length,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
    };
  }, [transactions]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    const sorted = [...transactions].sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
    
    sorted.forEach(transaction => {
      const date = new Date(transaction.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Ontem';
      } else {
        key = date.toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: 'long',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(transaction);
    });
    
    return groups;
  }, [transactions]);

  const getCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return '📝';
    
    const icons: Record<string, string> = {
      'Alimentação': '🍔',
      'Transporte': '🚗',
      'Moradia': '🏠',
      'Saúde': '⚕️',
      'Educação': '📚',
      'Lazer': '🎮',
      'Compras': '🛍️',
      'Salário': '💰',
      'Investimentos': '📈',
      'Freelance': '💼',
      'Outros': '📝',
    };
    
    return icons[categoryName] || '📝';
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as suas movimentações financeiras
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData(false)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.income)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.incomeCount} {stats.incomeCount === 1 ? 'transação' : 'transações'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(stats.expense)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.expenseCount} {stats.expenseCount === 1 ? 'transação' : 'transações'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(stats.balance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transactions.length} transações no período
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full ${stats.balance >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'} flex items-center justify-center`}>
                <DollarSign className={`h-6 w-6 ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filters.period} onValueChange={(v) => updateFilter('period', v)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.categoryId} onValueChange={(v) => updateFilter('categoryId', v)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.accountId} onValueChange={(v) => updateFilter('accountId', v)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-4">
              <DollarSign className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma transação encontrada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {hasActiveFilters 
                ? 'Tente ajustar os filtros ou adicione uma nova transação'
                : 'Comece adicionando sua primeira transação financeira'
              }
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Transação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dayTransactions]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {date}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {dayTransactions.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {dayTransactions.map((transaction) => {
                  const isExpense = transaction.type === 'expense';
                  const amount = Math.abs(Number(transaction.amount));
                  
                  return (
                    <Card 
                      key={transaction.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleTransactionClick(transaction)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="text-2xl">
                              {getCategoryIcon(transaction.category_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">
                                {transaction.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {transaction.category_name && (
                                  <span className="text-xs text-muted-foreground">
                                    {transaction.category_name}
                                  </span>
                                )}
                                {transaction.account_name && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      {transaction.account_name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                              {isExpense ? '-' : '+'} {formatCurrency(amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTransactionDialogV2
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => loadData(false)}
      />

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        transaction={selectedTransaction}
        onUpdate={() => loadData(false)}
        onDelete={() => {
          setSheetOpen(false);
          loadData(false);
        }}
      />
    </div>
  );
}
