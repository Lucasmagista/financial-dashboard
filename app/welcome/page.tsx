import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wallet, TrendingUp, Target, Shield, Zap, Lock, BarChartBig as ChartBar, Bell } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-balance">
            Gerencie suas Finanças com Inteligência
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Dashboard financeiro completo com Open Finance, controle de gastos, orçamentos e metas
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button asChild size="lg">
              <Link href="/auth/register">
                Começar Agora
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">
                Já tenho conta
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Open Finance</h3>
            <p className="text-sm text-muted-foreground">
              Conecte seus bancos de forma segura e sincronize automaticamente
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ChartBar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Análises Detalhadas</h3>
            <p className="text-sm text-muted-foreground">
              Gráficos e insights sobre seus gastos e receitas
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Metas e Orçamentos</h3>
            <p className="text-sm text-muted-foreground">
              Defina objetivos financeiros e acompanhe seu progresso
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Alertas Inteligentes</h3>
            <p className="text-sm text-muted-foreground">
              Receba notificações sobre gastos e orçamentos
            </p>
          </Card>
        </div>

        {/* Security Section */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Segurança em Primeiro Lugar</h2>
              <p className="text-muted-foreground">
                Seus dados estão protegidos com criptografia de ponta a ponta
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="font-medium">Criptografia SSL/TLS</p>
                <p className="text-sm text-muted-foreground">
                  Todas as comunicações são criptografadas
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="font-medium">Autenticação Segura</p>
                <p className="text-sm text-muted-foreground">
                  Senhas protegidas com hash SHA-256
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="font-medium">Conformidade LGPD</p>
                <p className="text-sm text-muted-foreground">
                  Seus dados pessoais estão seguros
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
