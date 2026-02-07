'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Building2,
  ChevronRight,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  TrendingUp
} from 'lucide-react';
import { BankLogo } from '@/components/bank-logo';
import { useToast } from '@/hooks/use-toast';
import { Account } from '@/lib/db';
import { BankAccountsSheet } from '@/components/bank-accounts-sheet';

interface BankGroup {
  bankName: string;
  bankCode?: string;
  accounts: Account[];
  totalBalance: number;
  accountCount: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedBank, setSelectedBank] = useState<BankGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch('/api/accounts', {
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar contas',
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
    
    // Refresh quando a aba fica visível
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
  }, []);

  const groupAccountsByBank = (): BankGroup[] => {
    const groups = new Map<string, BankGroup>();

    accounts.forEach((account) => {
      const bankName = account.bank_name || 'Sem Banco';
      
      if (!groups.has(bankName)) {
        groups.set(bankName, {
          bankName,
          bankCode: account.bank_name ? getBankCode(account.bank_name) : undefined,
          accounts: [],
          totalBalance: 0,
          accountCount: 0,
        });
      }

      const group = groups.get(bankName)!;
      group.accounts.push(account);
      group.accountCount++;
      
      // Para cartões de crédito, subtrai do total; para outras contas, soma
      if (account.account_type === 'credit_card') {
        group.totalBalance += Math.min(0, account.balance);
      } else {
        group.totalBalance += account.balance;
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.totalBalance - a.totalBalance);
  };

  const getBankCode = (bankName: string): string | undefined => {
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

  const calculateStats = () => {
    const assets = accounts
      .filter(acc => acc.account_type !== 'credit_card')
      .reduce((sum, acc) => sum + acc.balance, 0);
    
    const liabilities = Math.abs(accounts
      .filter(acc => acc.account_type === 'credit_card')
      .reduce((sum, acc) => sum + Math.min(0, acc.balance), 0));
    
    return {
      total: assets - liabilities,
      assets,
      liabilities,
      accountsCount: accounts.length,
    };
  };

  const handleBankClick = (bank: BankGroup) => {
    setSelectedBank(bank);
    setSheetOpen(true);
  };

  const handleAddManualAccount = () => {
    setSelectedBank(null);
    setSheetOpen(true);
  };
  
  const handleUpdate = () => {
    loadData(false);
  };

  const stats = calculateStats();
  const bankGroups = groupAccountsByBank();

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8">
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
          <h1 className="text-3xl font-bold tracking-tight">Minhas Contas</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e cartões de crédito
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowBalances(!showBalances)}
          >
            {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button onClick={handleAddManualAccount}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Patrimônio Líquido</p>
                <p className="text-3xl font-bold">
                  {showBalances ? `R$ ${stats.total.toFixed(2)}` : '••••••'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.accountsCount} {stats.accountsCount === 1 ? 'conta' : 'contas'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Ativos Totais</p>
                <p className="text-3xl font-bold text-green-600">
                  {showBalances ? `R$ ${stats.assets.toFixed(2)}` : '••••••'}
                </p>
                <p className="text-xs text-muted-foreground">Contas e investimentos</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Passivos Totais</p>
                <p className="text-3xl font-bold text-red-600">
                  {showBalances ? `R$ ${stats.liabilities.toFixed(2)}` : '••••••'}
                </p>
                <p className="text-xs text-muted-foreground">Cartões e dívidas</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Instituições Financeiras</h2>
          <Badge variant="secondary">{bankGroups.length}</Badge>
        </div>

        {bankGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Wallet className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma conta criada</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Comece adicionando suas primeiras contas bancárias e cartões de crédito
              </p>
              <Button onClick={handleAddManualAccount}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {bankGroups.map((bank) => {
              const isNegative = bank.totalBalance < 0;
              const balanceColor = isNegative ? 'text-red-600' : 'text-green-600';
              
              return (
                <Card 
                  key={bank.bankName}
                  className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
                  onClick={() => handleBankClick(bank)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="relative">
                          {bank.bankCode ? (
                            <BankLogo 
                              bankCode={bank.bankCode}
                              bankName={bank.bankName}
                              size={48}
                              className="rounded-xl"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{bank.bankName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {bank.accountCount} {bank.accountCount === 1 ? 'conta' : 'contas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">Saldo Total</p>
                          <p className={`text-xl font-bold ${balanceColor}`}>
                            {showBalances ? `R$ ${Math.abs(bank.totalBalance).toFixed(2)}` : '••••••'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank Accounts Sheet */}
      <BankAccountsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bank={selectedBank}
        showBalances={showBalances}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
