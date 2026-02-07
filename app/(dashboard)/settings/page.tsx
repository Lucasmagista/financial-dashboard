'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  Smartphone, 
  Mail, 
  Globe, 
  Moon, 
  Sun, 
  DollarSign, 
  Calendar,
  Lock,
  Shield,
  Database,
  Download,
  Loader2,
  Check,
  FileJson,
  FileSpreadsheet,
  Key,
  BarChart3,
  TrendingUp,
  Target,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  budget_alerts: boolean;
  transaction_alerts: boolean;
  theme: string;
  language: string;
  currency: string;
  date_format: string;
  week_start: string;
  session_timeout: string;
}

interface UserStats {
  accounts: {
    total: number;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
  };
  transactions: {
    total: number;
    total_income: number;
    total_expenses: number;
    net_savings: number;
    days_since_start: number;
    avg_daily_expenses: number;
  };
  categories: {
    total: number;
  };
  budgets: {
    total: number;
    active: number;
  };
  goals: {
    total: number;
    completed: number;
    total_target_amount: number;
    total_saved_amount: number;
    completion_rate: number;
  };
}

const defaultSettings: UserSettings = {
  email_notifications: true,
  push_notifications: false,
  budget_alerts: true,
  transaction_alerts: true,
  theme: 'system',
  language: 'pt-br',
  currency: 'BRL',
  date_format: 'dd/mm/yyyy',
  week_start: 'sunday',
  session_timeout: '30',
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings);
  
  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Load settings from API
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/user/settings');
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings(data.settings);
            setOriginalSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    async function loadStats() {
      try {
        const response = await fetch('/api/user/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }
    
    loadSettings();
    loadStats();
  }, [router]);

  // Update settings handler
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Apply theme immediately
    if (key === 'theme') {
      setTheme(value as string);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setOriginalSettings(settings);
      setHasChanges(false);
      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Export data
  const exportData = async (format: 'json' | 'csv') => {
    setExporting(format);
    try {
      const response = await fetch(`/api/user/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financedash-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Exportação concluída',
        description: `Seus dados foram exportados em formato ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  // Change password
  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });

      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Não foi possível alterar a senha. Verifique sua senha atual.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: settings.currency,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Personalize sua experiência no FinanceDash
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notificações</h2>
              <p className="text-sm text-muted-foreground">
                Escolha como você quer ser notificado
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Notificações por Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de orçamento e resumos mensais
                </p>
              </div>
              <Switch 
                id="email-notifications" 
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Notificações Push
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alertas em tempo real no navegador
                </p>
              </div>
              <Switch 
                id="push-notifications" 
                checked={settings.push_notifications}
                onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-alerts" className="flex items-center gap-2">
                  Alertas de Orçamento
                </Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando atingir 80% do orçamento
                </p>
              </div>
              <Switch 
                id="budget-alerts" 
                checked={settings.budget_alerts}
                onCheckedChange={(checked) => updateSetting('budget_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="transaction-alerts">Novas Transações</Label>
                <p className="text-sm text-muted-foreground">
                  Alertar sobre cada nova transação sincronizada
                </p>
              </div>
              <Switch 
                id="transaction-alerts" 
                checked={settings.transaction_alerts}
                onCheckedChange={(checked) => updateSetting('transaction_alerts', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-2">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Aparência</h2>
              <p className="text-sm text-muted-foreground">
                Personalize a interface do aplicativo
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha entre claro, escuro ou automático
                </p>
              </div>
              <Select 
                value={settings.theme} 
                onValueChange={(value) => updateSetting('theme', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Claro
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Escuro
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Sistema
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Idioma
                </Label>
                <p className="text-sm text-muted-foreground">
                  Idioma da interface
                </p>
              </div>
              <Select 
                value={settings.language} 
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-br">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Financial Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Preferências Financeiras</h2>
              <p className="text-sm text-muted-foreground">
                Configure como seus dados financeiros são exibidos
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="currency">Moeda Principal</Label>
                <p className="text-sm text-muted-foreground">
                  Moeda padrão para exibição
                </p>
              </div>
              <Select 
                value={settings.currency} 
                onValueChange={(value) => updateSetting('currency', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">R$ Real (BRL)</SelectItem>
                  <SelectItem value="USD">$ Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="date-format" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Formato de Data
                </Label>
                <p className="text-sm text-muted-foreground">
                  Como as datas são exibidas
                </p>
              </div>
              <Select 
                value={settings.date_format} 
                onValueChange={(value) => updateSetting('date_format', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/mm/yyyy">DD/MM/AAAA</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/DD/AAAA</SelectItem>
                  <SelectItem value="yyyy-mm-dd">AAAA-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="start-week">Início da Semana</Label>
                <p className="text-sm text-muted-foreground">
                  Primeiro dia da semana nos calendários
                </p>
              </div>
              <Select 
                value={settings.week_start} 
                onValueChange={(value) => updateSetting('week_start', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Domingo</SelectItem>
                  <SelectItem value="monday">Segunda-feira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Privacy & Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Privacidade e Segurança</h2>
              <p className="text-sm text-muted-foreground">
                Controle seus dados e segurança
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Alterar Senha
                </Label>
                <p className="text-sm text-muted-foreground">
                  Atualize sua senha para manter sua conta segura
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setPasswordDialogOpen(true)}
              >
                Alterar Senha
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Autenticação de Dois Fatores
                  <Badge variant="secondary" className="ml-2">Em breve</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adicione uma camada extra de segurança
                </p>
              </div>
              <Switch id="two-factor" disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Timeout de Sessão</Label>
                <p className="text-sm text-muted-foreground">
                  Tempo antes de desconexão automática
                </p>
              </div>
              <Select 
                value={settings.session_timeout} 
                onValueChange={(value) => updateSetting('session_timeout', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="never">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* User Statistics */}
        {!loadingStats && stats && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-2">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Estatísticas da Conta</h2>
                <p className="text-sm text-muted-foreground">
                  Resumo da sua atividade financeira
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Patrimônio Líquido</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(stats.accounts.net_worth)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.accounts.total} conta{stats.accounts.total !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Receitas Totais</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.transactions.total_income)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.transactions.total} transaç{stats.transactions.total !== 1 ? 'ões' : 'ão'}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                  <span className="text-sm font-medium">Despesas Totais</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.transactions.total_expenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Média diária: {formatCurrency(stats.transactions.avg_daily_expenses)}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Economia Líquida</span>
                </div>
                <p className={`text-2xl font-bold ${stats.transactions.net_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.transactions.net_savings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.transactions.days_since_start} dias de histórico
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Metas</span>
                </div>
                <p className="text-2xl font-bold">{stats.goals.completed}/{stats.goals.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.goals.completion_rate.toFixed(0)}% concluídas
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Orçamentos</span>
                </div>
                <p className="text-2xl font-bold">{stats.budgets.active}/{stats.budgets.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  orçamentos ativos
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Data Management */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-full bg-primary/10 p-2">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Gestão de Dados</h2>
              <p className="text-sm text-muted-foreground">
                Exporte ou remova seus dados
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 justify-start bg-transparent"
                onClick={() => exportData('json')}
                disabled={exporting !== null}
              >
                {exporting === 'json' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                Exportar JSON
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 justify-start bg-transparent"
                onClick={() => exportData('csv')}
                disabled={exporting !== null}
              >
                {exporting === 'csv' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Exportar CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Baixe todas as suas informações financeiras incluindo contas, transações, orçamentos e metas
            </p>
          </div>
        </Card>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha forte
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a nova senha novamente"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              disabled={changingPassword}
            >
              Cancelar
            </Button>
            <Button
              onClick={changePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
