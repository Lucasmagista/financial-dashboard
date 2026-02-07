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
  DollarSign,
  ChevronRight,
  Building2,
  RefreshCw,
  Wallet,
  CreditCard
} from 'lucide-react';
import { BankLogo } from '@/components/bank-logo';
import { AddTransactionDialogV2 } from '@/components/add-transaction-dialog-v2';
import { AccountTransactionsSheet } from '@/components/account-transactions-sheet';
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
  transaction_date: string;
  is_recurring?: boolean;
  merchant?: string;
  notes?: string | null;
  tags?: string[] | null;
  status?: string | null;
  provider_code?: string | null;
  open_finance_id?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  mcc?: string | null;
  bank_category?: string | null;
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
  account_type: 'checking' | 'savings' | 'investment' | 'credit_card' | 'other';
  bank_name?: string;
  bank_code?: string;
  currency: string;
  is_active: boolean;
  color?: string;
}

interface AccountGroup {
  account: Account;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
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
  const [selectedAccountGroup, setSelectedAccountGroup] = useState<AccountGroup | null>(null);
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
      params.append('limit', '1000');
      
      // Período
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
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    return { 
      income, 
      expense, 
      balance: income - expense,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  const accountGroups = useMemo((): AccountGroup[] => {
    const groups: Record<string, AccountGroup> = {};
    
    // Primeiro, criar grupos para todas as contas ativas
    accounts
      .filter(acc => acc.is_active)
      .forEach(account => {
        groups[account.id] = {
          account,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          transactionCount: 0,
        };
      });
    
    // Depois, adicionar transações aos grupos
    transactions.forEach(transaction => {
      if (groups[transaction.account_id]) {
        const group = groups[transaction.account_id];
        group.transactions.push(transaction);
        group.transactionCount++;
        
        const amount = Math.abs(Number(transaction.amount));
        if (transaction.type === 'income') {
          group.totalIncome += amount;
        } else {
          group.totalExpense += amount;
        }
      }
    });
    
    // Converter para array e ordenar por número de transações
    return Object.values(groups)
      .sort((a, b) => b.transactionCount - a.transactionCount);
  }, [transactions, accounts]);

  const getBankCode = (bankName?: string): string | undefined => {
    if (!bankName) return undefined;
    
    const bankMap: Record<string, string> = {
      'Nubank': '0260',
      'Inter': '0077',
      'Itaú': '0341',
      'Bradesco': '0237',
      'Banco do Brasil': '0001',
      'Santander': '0033',
      'Caixa': '0104',
      'BTG Pactual': '0208',
      'C6 Bank': '0336',
      'Neon': '0655',
      'PagBank': '0290',
      'Mercado Pago': '0323',
      'PicPay': '0380',
      'Original': '0212',
      'Safra': '0422',
    };
    
    return bankMap[bankName];
  };

  const handleAccountClick = (group: AccountGroup) => {
    setSelectedAccountGroup(group);
    setSheetOpen(true);
  };

  const handleUpdate = () => {
    loadData(false);
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
        
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
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
          <h1 className="text-3xl font-bold tracking-tight">Transações por Conta</h1>
          <p className="text-muted-foreground">
            Visualize movimentações com detalhes de método, status e origem bancária
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
                <p className="text-sm font-medium text-muted-foreground">Total Receitas</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.income)}
                </p>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
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
                <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(stats.expense)}
                </p>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
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
                <p className="text-sm font-medium text-muted-foreground">Saldo Período</p>
                <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(stats.balance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.transactionCount} transações
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
          <div className="flex flex-col lg:flex-row gap-3">
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
              <SelectTrigger className="w-full md:w-44">
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
              <SelectTrigger className="w-full md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.categoryId} onValueChange={(v) => updateFilter('categoryId', v)}>
              <SelectTrigger className="w-full md:w-48">
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
              <SelectTrigger className="w-full md:w-48">
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

      {/* Accounts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Contas com Transações</h2>
          <Badge variant="secondary">{accountGroups.filter(g => g.transactionCount > 0).length}</Badge>
        </div>

        {accountGroups.filter(g => g.transactionCount > 0).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Wallet className="w-12 h-12 text-muted-foreground" />
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
          <div className="grid gap-3 md:grid-cols-2">
            {accountGroups
              .filter(g => g.transactionCount > 0)
              .map((group) => {
                const isCredit = group.account.account_type === 'credit_card';
                const bankCode = getBankCode(group.account.bank_name);
                const net = group.totalIncome - group.totalExpense;
                const balanceColor = net >= 0 ? 'text-green-600' : 'text-red-600';

                return (
                  <Card 
                    key={group.account.id}
                    className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                    onClick={() => handleAccountClick(group)}
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          {bankCode ? (
                            <BankLogo 
                              bankCode={bankCode}
                              bankName={group.account.bank_name || ''}
                              size={48}
                              className="rounded-xl"
                            />
                          ) : (
                            <div 
                              className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
                              style={{ backgroundColor: group.account.color || '#3b82f6' }}
                            >
                              {isCredit ? <CreditCard className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{group.account.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Wallet className="h-3 w-3" /> {group.transactionCount} mov.
                              </Badge>
                              {group.account.bank_name && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {group.account.bank_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">
                              {isCredit ? 'Fatura período' : 'Saldo período'}
                            </p>
                            <p className={`text-xl font-bold ${balanceColor}`}>
                              {formatCurrency(Math.abs(net))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Saldo: {formatCurrency(group.account.balance)}
                            </p>
                          </div>
                          <Badge variant={net >= 0 ? 'default' : 'destructive'} className="gap-1 h-8">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(net)}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Receitas</p>
                          <p className="font-semibold text-green-600">{formatCurrency(group.totalIncome)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Despesas</p>
                          <p className="font-semibold text-red-600">{formatCurrency(group.totalExpense)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Tipo</p>
                          <p className="font-semibold capitalize">{group.account.account_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Transações detalhadas */}
      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Wallet className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nada encontrado</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                {hasActiveFilters
                  ? 'Ajuste os filtros para ver outras movimentações'
                  : 'Conecte contas ou adicione transações para começar'}
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Transação
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((transaction) => {
                const amount = Math.abs(Number(transaction.amount));
                const isIncome = transaction.type === 'income';
                const account = accounts.find(a => a.id === transaction.account_id);
                const category = categories.find(c => c.id === transaction.category_id);
                const tags = transaction.tags || [];
                const notes = transaction.notes || '';

                return (
                  <div key={transaction.id} className="flex flex-col gap-3 px-4 py-3 hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold leading-tight truncate">{transaction.description}</p>
                            {transaction.open_finance_id && (
                              <Badge variant="outline" className="text-[10px] uppercase">Pluggy</Badge>
                            )}
                            {transaction.is_recurring && (
                              <Badge variant="secondary" className="gap-1 text-[10px]">
                                <RefreshCw className="h-3 w-3" /> Recorrente
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>{account?.name || 'Conta'}</span>
                            {category && (
                              <Badge variant="outline" className="text-[11px] py-0 px-1.5">
                                {category.name}
                              </Badge>
                            )}
                            {transaction.status && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase">{transaction.status}</Badge>
                            )}
                            {transaction.payment_method && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase">
                                {transaction.payment_method}
                              </Badge>
                            )}
                            {transaction.mcc && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">MCC {transaction.mcc}</Badge>
                            )}
                          </div>
                          {notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{notes}</p>
                          )}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 6).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                                  {tag.replace(/-/g, ' ')}
                                </Badge>
                              ))}
                              {tags.length > 6 && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">+{tags.length - 6}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={`text-lg font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{account?.currency || 'BRL'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialogV2
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleUpdate}
      />

      <AccountTransactionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        accountGroup={selectedAccountGroup}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
