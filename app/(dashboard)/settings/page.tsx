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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Wallet,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  PieChart,
  Cloud,
  Building2,
  Eye,
  Trash2,
  History,
  Sparkles,
  LayoutDashboard,
  AlertTriangle,
  Info,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface UserSettings {
  // Notificações
  email_notifications: boolean;
  push_notifications: boolean;
  budget_alerts: boolean;
  transaction_alerts: boolean;
  goal_alerts: boolean;
  monthly_summary: boolean;
  weekly_summary: boolean;
  large_transaction_alert: boolean;
  large_transaction_threshold: number;
  unusual_activity_alert: boolean;
  bill_reminders: boolean;
  bill_reminder_days: number;
  
  // Aparência
  theme: string;
  language: string;
  compact_mode: boolean;
  show_animations: boolean;
  
  // Financeiro
  currency: string;
  date_format: string;
  week_start: string;
  decimal_places: number;
  show_cents: boolean;
  group_thousands: boolean;
  
  // Dashboard
  dashboard_default_view: string;
  dashboard_cards: string[];
  show_net_worth: boolean;
  show_recent_transactions: number;
  
  // Categorização
  auto_categorize: boolean;
  auto_categorize_threshold: number;
  learn_from_corrections: boolean;
  suggest_categories: boolean;
  
  // Relatórios
  default_report_period: string;
  include_pending: boolean;
  compare_previous_period: boolean;
  
  // Backup
  auto_backup: boolean;
  backup_frequency: string;
  backup_include_attachments: boolean;
  
  // Open Finance
  auto_sync_enabled: boolean;
  sync_frequency: string;
  sync_notifications: boolean;
  
  // Segurança
  session_timeout: string;
  require_password_change: boolean;
  password_change_days: number;
  login_notifications: boolean;
  two_factor_enabled: boolean;
  show_balance_on_login: boolean;
  biometric_enabled: boolean;
  
  // Privacidade
  data_retention_days: number;
  allow_analytics: boolean;
  allow_crash_reports: boolean;
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
  // Notificações
  email_notifications: true,
  push_notifications: false,
  budget_alerts: true,
  transaction_alerts: true,
  goal_alerts: true,
  monthly_summary: true,
  weekly_summary: false,
  large_transaction_alert: true,
  large_transaction_threshold: 1000,
  unusual_activity_alert: true,
  bill_reminders: true,
  bill_reminder_days: 3,
  
  // Aparência
  theme: 'system',
  language: 'pt-br',
  compact_mode: false,
  show_animations: true,
  
  // Financeiro
  currency: 'BRL',
  date_format: 'dd/mm/yyyy',
  week_start: 'sunday',
  decimal_places: 2,
  show_cents: true,
  group_thousands: true,
  
  // Dashboard
  dashboard_default_view: 'overview',
  dashboard_cards: ['balance', 'expenses', 'income', 'goals'],
  show_net_worth: true,
  show_recent_transactions: 5,
  
  // Categorização
  auto_categorize: true,
  auto_categorize_threshold: 70,
  learn_from_corrections: true,
  suggest_categories: true,
  
  // Relatórios
  default_report_period: 'month',
  include_pending: false,
  compare_previous_period: true,
  
  // Backup
  auto_backup: true,
  backup_frequency: 'weekly',
  backup_include_attachments: false,
  
  // Open Finance
  auto_sync_enabled: true,
  sync_frequency: 'daily',
  sync_notifications: true,
  
  // Segurança
  session_timeout: '30',
  require_password_change: false,
  password_change_days: 90,
  login_notifications: true,
  two_factor_enabled: false,
  show_balance_on_login: true,
  biometric_enabled: false,
  
  // Privacidade
  data_retention_days: 365,
  allow_analytics: true,
  allow_crash_reports: true,
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme: _theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

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
            const loadedSettings = { ...defaultSettings, ...data.settings };
            setSettings(loadedSettings);
            setOriginalSettings(loadedSettings);
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

  // Check for unsaved changes before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Update settings handler
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Apply theme immediately
    if (key === 'theme') {
      setTheme(value as string);
    }
  };

  // Handle tab change with unsaved changes check
  const handleTabChange = (newTab: string) => {
    if (hasChanges) {
      setPendingTab(newTab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  // Confirm tab change without saving
  const confirmTabChange = () => {
    if (pendingTab) {
      setSettings(originalSettings);
      setHasChanges(false);
      setActiveTab(pendingTab);
      setPendingTab(null);
      setShowUnsavedDialog(false);
    }
  };

  // Save and change tab
  const saveAndChangeTab = async () => {
    await saveSettings();
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
      setShowUnsavedDialog(false);
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
      console.error('Save settings error:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const discardChanges = () => {
    setSettings(originalSettings);
    setHasChanges(false);
    setTheme(originalSettings.theme);
    toast({
      title: 'Alterações descartadas',
      description: 'As configurações foram restauradas.',
    });
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
      console.error('Export error:', error);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao alterar senha',
        description: errorMessage || 'Não foi possível alterar a senha. Verifique sua senha atual.',
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Configurações
            </h1>
            <p className="text-muted-foreground mt-2">
              Personalize sua experiência no FinanceDash
            </p>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertTitle className="text-orange-500">Alterações não salvas</AlertTitle>
            <AlertDescription className="text-orange-500/90">
              Você tem alterações que não foram salvas. 
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={saveSettings} 
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-3 w-3" />
                      Salvar Agora
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={discardChanges}
                  className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                >
                  <X className="mr-2 h-3 w-3" />
                  Descartar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 h-auto">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automação</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Estatísticas</span>
          </TabsTrigger>
        </TabsList>
        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Notificações</h2>
                <p className="text-sm text-muted-foreground">
                  Configure quando e como você quer ser notificado
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Canais de notificação */}
              <div>
                <h3 className="text-lg font-medium mb-4">Canais de Notificação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications" className="flex items-center gap-2 text-base">
                        <Mail className="h-4 w-4 text-primary" />
                        Notificações por Email
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receba alertas importantes e resumos periódicos
                      </p>
                    </div>
                    <Switch 
                      id="email-notifications" 
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications" className="flex items-center gap-2 text-base">
                        <Smartphone className="h-4 w-4 text-primary" />
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
                </div>
              </div>

              <Separator />

              {/* Alertas Financeiros */}
              <div>
                <h3 className="text-lg font-medium mb-4">Alertas Financeiros</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="budget-alerts" className="text-base">Alertas de Orçamento</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando atingir 80% e 100% do orçamento
                      </p>
                    </div>
                    <Switch 
                      id="budget-alerts" 
                      checked={settings.budget_alerts}
                      onCheckedChange={(checked) => updateSetting('budget_alerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="transaction-alerts" className="text-base">Novas Transações</Label>
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

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="goal-alerts" className="text-base">Progresso de Metas</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando atingir marcos nas metas (25%, 50%, 75%, 100%)
                      </p>
                    </div>
                    <Switch 
                      id="goal-alerts" 
                      checked={settings.goal_alerts}
                      onCheckedChange={(checked) => updateSetting('goal_alerts', checked)}
                    />
                  </div>

                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="large-transaction-alert" className="text-base">
                          Transações Grandes
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Alertar sobre transações acima de um valor específico
                        </p>
                      </div>
                      <Switch 
                        id="large-transaction-alert" 
                        checked={settings.large_transaction_alert}
                        onCheckedChange={(checked) => updateSetting('large_transaction_alert', checked)}
                      />
                    </div>
                    {settings.large_transaction_alert && (
                      <div className="pt-3 border-t">
                        <Label className="text-sm">Valor mínimo: R$ {settings.large_transaction_threshold}</Label>
                        <Slider
                          value={[settings.large_transaction_threshold]}
                          onValueChange={([value]) => updateSetting('large_transaction_threshold', value)}
                          min={100}
                          max={10000}
                          step={100}
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="unusual-activity-alert" className="flex items-center gap-2 text-base">
                        Atividade Incomum
                        <Badge variant="secondary" className="text-xs">IA</Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Detectar e alertar sobre padrões de gastos incomuns
                      </p>
                    </div>
                    <Switch 
                      id="unusual-activity-alert" 
                      checked={settings.unusual_activity_alert}
                      onCheckedChange={(checked) => updateSetting('unusual_activity_alert', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resumos Periódicos */}
              <div>
                <h3 className="text-lg font-medium mb-4">Resumos Periódicos</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="monthly-summary" className="text-base">Resumo Mensal</Label>
                      <p className="text-sm text-muted-foreground">
                        Receba um relatório completo todo início de mês
                      </p>
                    </div>
                    <Switch 
                      id="monthly-summary" 
                      checked={settings.monthly_summary}
                      onCheckedChange={(checked) => updateSetting('monthly_summary', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="weekly-summary" className="text-base">Resumo Semanal</Label>
                      <p className="text-sm text-muted-foreground">
                        Resumo das suas finanças toda segunda-feira
                      </p>
                    </div>
                    <Switch 
                      id="weekly-summary" 
                      checked={settings.weekly_summary}
                      onCheckedChange={(checked) => updateSetting('weekly_summary', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lembretes */}
              <div>
                <h3 className="text-lg font-medium mb-4">Lembretes</h3>
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="bill-reminders" className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-primary" />
                        Lembretes de Contas
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Lembrar de pagar contas antes do vencimento
                      </p>
                    </div>
                    <Switch 
                      id="bill-reminders" 
                      checked={settings.bill_reminders}
                      onCheckedChange={(checked) => updateSetting('bill_reminders', checked)}
                    />
                  </div>
                  {settings.bill_reminders && (
                    <div className="pt-3 border-t">
                      <Label className="text-sm">Lembrar com {settings.bill_reminder_days} dias de antecedência</Label>
                      <Slider
                        value={[settings.bill_reminder_days]}
                        onValueChange={([value]) => updateSetting('bill_reminder_days', value)}
                        min={1}
                        max={15}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Sun className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Aparência</h2>
                <p className="text-sm text-muted-foreground">
                  Personalize a interface do aplicativo
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="theme" className="text-base">Tema</Label>
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="language" className="flex items-center gap-2 text-base">
                      <Globe className="h-4 w-4 text-primary" />
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

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="compact-mode" className="text-base">Modo Compacto</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduzir espaços e mostrar mais informações na tela
                    </p>
                  </div>
                  <Switch 
                    id="compact-mode" 
                    checked={settings.compact_mode}
                    onCheckedChange={(checked) => updateSetting('compact_mode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="show-animations" className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Animações
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar animações e transições suaves
                    </p>
                  </div>
                  <Switch 
                    id="show-animations" 
                    checked={settings.show_animations}
                    onCheckedChange={(checked) => updateSetting('show_animations', checked)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Preferências Financeiras</h2>
                <p className="text-sm text-muted-foreground">
                  Configure como seus dados financeiros são exibidos
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Formato e Moeda</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="currency" className="text-base">Moeda Principal</Label>
                      <p className="text-sm text-muted-foreground">
                        Moeda padrão para exibição de valores
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
                        <SelectItem value="GBP">£ Libra (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="decimal-places" className="text-base">Casas Decimais</Label>
                      <p className="text-sm text-muted-foreground">
                        Número de casas decimais exibidas
                      </p>
                    </div>
                    <Select 
                      value={settings.decimal_places.toString()} 
                      onValueChange={(value) => updateSetting('decimal_places', parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 (R$ 1.234)</SelectItem>
                        <SelectItem value="2">2 (R$ 1.234,56)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="show-cents" className="text-base">Mostrar Centavos</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir centavos em todos os valores
                      </p>
                    </div>
                    <Switch 
                      id="show-cents" 
                      checked={settings.show_cents}
                      onCheckedChange={(checked) => updateSetting('show_cents', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="group-thousands" className="text-base">Separador de Milhares</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar ponto ou vírgula para separar milhares
                      </p>
                    </div>
                    <Switch 
                      id="group-thousands" 
                      checked={settings.group_thousands}
                      onCheckedChange={(checked) => updateSetting('group_thousands', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Data e Hora</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="date-format" className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-primary" />
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

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="week-start" className="text-base">Início da Semana</Label>
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
                        <SelectItem value="saturday">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Dashboard</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="dashboard-default-view" className="flex items-center gap-2 text-base">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        Visão Padrão
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Página inicial ao abrir o dashboard
                      </p>
                    </div>
                    <Select 
                      value={settings.dashboard_default_view} 
                      onValueChange={(value) => updateSetting('dashboard_default_view', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Visão Geral</SelectItem>
                        <SelectItem value="expenses">Despesas</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="goals">Metas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="show-net-worth" className="text-base">Mostrar Patrimônio Líquido</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir patrimônio líquido no dashboard
                      </p>
                    </div>
                    <Switch 
                      id="show-net-worth" 
                      checked={settings.show_net_worth}
                      onCheckedChange={(checked) => updateSetting('show_net_worth', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="show-recent-transactions" className="text-base">
                        Transações Recentes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Quantidade de transações recentes no dashboard: {settings.show_recent_transactions}
                      </p>
                      <Slider
                        value={[settings.show_recent_transactions]}
                        onValueChange={([value]) => updateSetting('show_recent_transactions', value)}
                        min={3}
                        max={15}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Automação e IA</h2>
                <p className="text-sm text-muted-foreground">
                  Configure recursos automáticos e inteligentes
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Categorização */}
              <div>
                <h3 className="text-lg font-medium mb-4">Categorização Automática</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="auto-categorize" className="flex items-center gap-2 text-base">
                        <Brain className="h-4 w-4 text-primary" />
                        Categorização Automática
                        <Badge variant="secondary" className="text-xs">IA</Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Categorizar transações automaticamente usando IA
                      </p>
                    </div>
                    <Switch 
                      id="auto-categorize" 
                      checked={settings.auto_categorize}
                      onCheckedChange={(checked) => updateSetting('auto_categorize', checked)}
                    />
                  </div>

                  {settings.auto_categorize && (
                    <>
                      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <div>
                          <Label className="text-sm">
                            Confiança mínima: {settings.auto_categorize_threshold}%
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Categorizar automaticamente apenas com {settings.auto_categorize_threshold}% ou mais de confiança
                          </p>
                          <Slider
                            value={[settings.auto_categorize_threshold]}
                            onValueChange={([value]) => updateSetting('auto_categorize_threshold', value)}
                            min={50}
                            max={95}
                            step={5}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="learn-from-corrections" className="text-base">
                            Aprender com Correções
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Melhorar a IA quando você corrige categorizações
                          </p>
                        </div>
                        <Switch 
                          id="learn-from-corrections" 
                          checked={settings.learn_from_corrections}
                          onCheckedChange={(checked) => updateSetting('learn_from_corrections', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="suggest-categories" className="text-base">
                            Sugerir Categorias
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Mostrar sugestões de categorias ao criar transações
                          </p>
                        </div>
                        <Switch 
                          id="suggest-categories" 
                          checked={settings.suggest_categories}
                          onCheckedChange={(checked) => updateSetting('suggest_categories', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Open Finance */}
              <div>
                <h3 className="text-lg font-medium mb-4">Open Finance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="auto-sync-enabled" className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-primary" />
                        Sincronização Automática
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Sincronizar transações bancárias automaticamente
                      </p>
                    </div>
                    <Switch 
                      id="auto-sync-enabled" 
                      checked={settings.auto_sync_enabled}
                      onCheckedChange={(checked) => updateSetting('auto_sync_enabled', checked)}
                    />
                  </div>

                  {settings.auto_sync_enabled && (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="sync-frequency" className="text-base">
                            Frequência de Sincronização
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Com que frequência buscar novas transações
                          </p>
                        </div>
                        <Select 
                          value={settings.sync_frequency} 
                          onValueChange={(value) => updateSetting('sync_frequency', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Tempo Real</SelectItem>
                            <SelectItem value="hourly">A cada hora</SelectItem>
                            <SelectItem value="daily">Diariamente</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="sync-notifications" className="text-base">
                            Notificar Sincronizações
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Avisar quando novas transações forem importadas
                          </p>
                        </div>
                        <Switch 
                          id="sync-notifications" 
                          checked={settings.sync_notifications}
                          onCheckedChange={(checked) => updateSetting('sync_notifications', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Backup */}
              <div>
                <h3 className="text-lg font-medium mb-4">Backup Automático</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="auto-backup" className="flex items-center gap-2 text-base">
                        <Cloud className="h-4 w-4 text-primary" />
                        Backup Automático
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Fazer backup dos dados periodicamente
                      </p>
                    </div>
                    <Switch 
                      id="auto-backup" 
                      checked={settings.auto_backup}
                      onCheckedChange={(checked) => updateSetting('auto_backup', checked)}
                    />
                  </div>

                  {settings.auto_backup && (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="backup-frequency" className="text-base">
                            Frequência de Backup
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Com que frequência fazer backup
                          </p>
                        </div>
                        <Select 
                          value={settings.backup_frequency} 
                          onValueChange={(value) => updateSetting('backup_frequency', value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5 flex-1">
                          <Label htmlFor="backup-include-attachments" className="text-base">
                            Incluir Anexos
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Incluir comprovantes e anexos no backup
                          </p>
                        </div>
                        <Switch 
                          id="backup-include-attachments" 
                          checked={settings.backup_include_attachments}
                          onCheckedChange={(checked) => updateSetting('backup_include_attachments', checked)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Relatórios */}
              <div>
                <h3 className="text-lg font-medium mb-4">Relatórios</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="default-report-period" className="flex items-center gap-2 text-base">
                        <PieChart className="h-4 w-4 text-primary" />
                        Período Padrão
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Período inicial ao abrir relatórios
                      </p>
                    </div>
                    <Select 
                      value={settings.default_report_period} 
                      onValueChange={(value) => updateSetting('default_report_period', value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mês</SelectItem>
                        <SelectItem value="quarter">Último Trimestre</SelectItem>
                        <SelectItem value="year">Último Ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="include-pending" className="text-base">
                        Incluir Pendentes
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Incluir transações pendentes nos relatórios
                      </p>
                    </div>
                    <Switch 
                      id="include-pending" 
                      checked={settings.include_pending}
                      onCheckedChange={(checked) => updateSetting('include_pending', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="compare-previous-period" className="text-base">
                        Comparar com Período Anterior
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar comparação automática nos gráficos
                      </p>
                    </div>
                    <Switch 
                      id="compare-previous-period" 
                      checked={settings.compare_previous_period}
                      onCheckedChange={(checked) => updateSetting('compare_previous_period', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Segurança e Privacidade</h2>
                <p className="text-sm text-muted-foreground">
                  Proteja sua conta e seus dados
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Autenticação */}
              <div>
                <h3 className="text-lg font-medium mb-4">Autenticação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                    <div className="space-y-0.5 flex-1">
                      <Label className="flex items-center gap-2 text-base cursor-pointer">
                        <Key className="h-4 w-4 text-primary" />
                        Senha da Conta
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Atualize sua senha regular mente para manter segurança
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      Alterar Senha
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="two-factor-enabled" className="flex items-center gap-2 text-base">
                        <Lock className="h-4 w-4 text-primary" />
                        Autenticação de Dois Fatores (2FA)
                        <Badge variant="secondary" className="text-xs">Em breve</Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Adicionar camada extra de segurança com código temporário
                      </p>
                    </div>
                    <Switch id="two-factor-enabled" disabled />
                  </div>

                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="require-password-change" className="text-base">
                          Exigir Troca de Senha Periódica
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Solicitar alteração de senha regularmente
                        </p>
                      </div>
                      <Switch 
                        id="require-password-change" 
                        checked={settings.require_password_change}
                        onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
                      />
                    </div>
                    {settings.require_password_change && (
                      <div className="pt-3 border-t">
                        <Label className="text-sm">Trocar senha a cada {settings.password_change_days} dias</Label>
                        <Slider
                          value={[settings.password_change_days]}
                          onValueChange={([value]) => updateSetting('password_change_days', value)}
                          min={30}
                          max={365}
                          step={30}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>30 dias</span>
                          <span>180 dias</span>
                          <span>365 dias</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sessão */}
              <div>
                <h3 className="text-lg font-medium mb-4">Gerenciamento de Sessão</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="session-timeout" className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-primary" />
                        Timeout de Sessão
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Tempo de inatividade antes de desconexão automática
                      </p>
                    </div>
                    <Select 
                      value={settings.session_timeout} 
                      onValueChange={(value) => updateSetting('session_timeout', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="240">4 horas</SelectItem>
                        <SelectItem value="480">8 horas</SelectItem>
                        <SelectItem value="1440">24 horas</SelectItem>
                        <SelectItem value="10080">7 dias</SelectItem>
                        <SelectItem value="21600">15 dias</SelectItem>
                        <SelectItem value="43200">30 dias</SelectItem>
                        <SelectItem value="never">Nunca expirar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="login-notifications" className="text-base">
                        Notificar Novos Logins
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receber alerta quando sua conta for acessada
                      </p>
                    </div>
                    <Switch 
                      id="login-notifications" 
                      checked={settings.login_notifications}
                      onCheckedChange={(checked) => updateSetting('login_notifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="show-balance-on-login" className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4 text-primary" />
                        Mostrar Saldo ao Fazer Login
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir saldo imediatamente ou ocultar por padrão
                      </p>
                    </div>
                    <Switch 
                      id="show-balance-on-login" 
                      checked={settings.show_balance_on_login}
                      onCheckedChange={(checked) => updateSetting('show_balance_on_login', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Privacidade */}
              <div>
                <h3 className="text-lg font-medium mb-4">Privacidade</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="allow-analytics" className="text-base">
                        Permitir Análise de Uso
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Ajude-nos a melhorar compartilhando dados anônimos de uso
                      </p>
                    </div>
                    <Switch 
                      id="allow-analytics" 
                      checked={settings.allow_analytics}
                      onCheckedChange={(checked) => updateSetting('allow_analytics', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="allow-crash-reports" className="text-base">
                        Relatórios de Erro
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar relatórios de erro automaticamente
                      </p>
                    </div>
                    <Switch 
                      id="allow-crash-reports" 
                      checked={settings.allow_crash_reports}
                      onCheckedChange={(checked) => updateSetting('allow_crash_reports', checked)}
                    />
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="space-y-0.5 mb-3">
                      <Label htmlFor="data-retention-days" className="flex items-center gap-2 text-base">
                        <History className="h-4 w-4 text-primary" />
                        Retenção de Dados
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Manter histórico por {settings.data_retention_days} dias
                      </p>
                    </div>
                    <Slider
                      value={[settings.data_retention_days]}
                      onValueChange={([value]) => updateSetting('data_retention_days', value)}
                      min={90}
                      max={1825}
                      step={90}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>90 dias</span>
                      <span>1 ano</span>
                      <span>5 anos</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Zona de Perigo */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-destructive flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Zona de Perigo
                </h3>
                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <Label className="text-base text-destructive">Excluir Conta</Label>
                      <p className="text-sm text-muted-foreground">
                        Deletar permanentemente sua conta e todos os dados associados. 
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="ml-4"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Gestão de Dados</h2>
                <p className="text-sm text-muted-foreground">
                  Exporte, importe ou gerencie seus dados financeiros
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Exportar Dados</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto p-4"
                    onClick={()=> exportData('json')}
                    disabled={exporting !== null}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {exporting === 'json' ? (
                        <Loader2 className="h-5 w-5 mt-0.5 animate-spin shrink-0" />
                      ) : (
                        <FileJson className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Exportar JSON</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formato estruturado, ideal para backup completo
                        </p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto p-4"
                    onClick={() => exportData('csv')}
                    disabled={exporting !== null}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {exporting === 'csv' ? (
                        <Loader2 className="h-5 w-5 mt-0.5 animate-spin shrink-0" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Exportar CSV</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Abrir no Excel ou Google Sheets
                        </p>
                      </div>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Inclui: transações, contas, orçamentos, metas, categorias e configurações
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Importar Dados</h3>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Importação de Dados</AlertTitle>
                  <AlertDescription className="text-sm">
                    Você pode importar transações de arquivos CSV ou OFX. 
                    <Button variant="link" className="h-auto p-0 ml-1" size="sm">
                      Ver formato suportado
                    </Button>
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-3">
                  <Download className="mr-2 h-4 w-4" />
                  Importar Arquivo
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-6">
          {!loadingStats && stats && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Estatísticas da Conta</h2>
                  <p className="text-sm text-muted-foreground">
                    Resumo completo da sua atividade financeira
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">Patrimônio Líquido</span>
                  </div>
                  <p className="text-3xl font-bold mb-1">{formatCurrency(stats.accounts.net_worth)}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.accounts.total} conta{stats.accounts.total !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-green-500/10 p-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium">Receitas Totais</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-1">{formatCurrency(stats.transactions.total_income)}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.transactions.total} transaç{stats.transactions.total !== 1 ? 'ões' : 'ão'}
                  </p>
                </div>

                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-red-500/10 p-2">
                      <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />
                    </div>
                    <span className="font-medium">Despesas Totais</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600 mb-1">{formatCurrency(stats.transactions.total_expenses)}</p>
                  <p className="text-sm text-muted-foreground">
                    Média: {formatCurrency(stats.transactions.avg_daily_expenses)}/dia
                  </p>
                </div>

                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">Economia Líquida</span>
                  </div>
                  <p className={`text-3xl font-bold mb-1 ${stats.transactions.net_savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stats.transactions.net_savings)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats.transactions.days_since_start} dias de histórico
                  </p>
                </div>

                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">Metas Financeiras</span>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.goals.completed}/{stats.goals.total}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.goals.completion_rate.toFixed(0)}% concluídas
                  </p>
                </div>

                <div className="p-5 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <PieChart className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">Orçamentos</span>
                  </div>
                  <p className="text-3xl font-bold mb-1">{stats.budgets.active}/{stats.budgets.total}</p>
                  <p className="text-sm text-muted-foreground">
                    orçamentos ativos
                  </p>
                </div>
              </div>
            </Card>
          )}
          
          {loadingStats && (
            <Card className="p-6">
              <Skeleton className="h-32 w-full" />
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alterações não salvas
            </DialogTitle>
            <DialogDescription>
              Você tem alterações que não foram salvas. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowUnsavedDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmTabChange}
            >
              Descartar Alterações
            </Button>
            <Button
              onClick={saveAndChangeTab}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Continuar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha forte com pelo menos 6 caracteres
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
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
