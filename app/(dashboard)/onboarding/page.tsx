'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Building2, ArrowRight, Check } from 'lucide-react';

const steps = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao FinanceDash!',
    description: 'Configure sua conta em poucos passos',
  },
  {
    id: 'account',
    title: 'Adicionar sua primeira conta',
    description: 'Comece adicionando uma conta bancária',
  },
  {
    id: 'done',
    title: 'Tudo pronto!',
    description: 'Sua conta está configurada',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [accountData, setAccountData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    bankName: '',
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    router.push('/');
  };

  const handleAddAccount = async () => {
    if (!accountData.name || !accountData.balance) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountData.name,
          accountType: accountData.type,
          balance: parseFloat(accountData.balance),
          currency: 'BRL',
          bankName: accountData.bankName || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      handleNext();
    } catch (error) {
      console.error('[v0] Error creating account:', error);
      alert('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{step.title}</CardTitle>
          <CardDescription>{step.description}</CardDescription>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx <= currentStep ? 'bg-primary w-12' : 'bg-muted w-8'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Controle Total</h3>
                      <p className="text-sm text-muted-foreground">
                        Gerencie todas as suas contas em um só lugar
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Open Finance</h3>
                      <p className="text-sm text-muted-foreground">
                        Conecte seus bancos de forma segura
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleNext} className="flex-1" size="lg">
                  Começar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da conta *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Conta Corrente"
                  value={accountData.name}
                  onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de conta *</Label>
                <Select
                  value={accountData.type}
                  onValueChange={(value) => setAccountData({ ...accountData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo atual *</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={accountData.balance}
                  onChange={(e) => setAccountData({ ...accountData, balance: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Banco (opcional)</Label>
                <Input
                  id="bankName"
                  placeholder="Ex: Banco do Brasil"
                  value={accountData.bankName}
                  onChange={(e) => setAccountData({ ...accountData, bankName: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1 bg-transparent"
                >
                  Pular
                </Button>
                <Button
                  onClick={handleAddAccount}
                  disabled={loading || !accountData.name || !accountData.balance}
                  className="flex-1"
                >
                  {loading ? 'Salvando...' : 'Adicionar conta'}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="text-center space-y-6 py-8">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Conta configurada com sucesso!</h3>
                <p className="text-muted-foreground">
                  Você pode adicionar mais contas ou conectar seus bancos via Open Finance a qualquer momento.
                </p>
              </div>

              <Button onClick={() => router.push('/')} size="lg" className="w-full">
                Ir para o Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
