'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function CreateAccountHelper() {
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const createTestUser = async () => {
    setCreating(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@financedash.com',
          password: 'Test123456',
          name: 'Usuário Teste',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message || 'Usuário criado com sucesso!' });
      } else {
        setResult({ success: false, message: data.error || 'Erro ao criar usuário' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Erro de rede ao criar usuário' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/30">
      <p className="text-sm text-muted-foreground mb-3">
        Não tem uma conta? Crie uma conta de teste para experimentar:
      </p>
      <Button 
        onClick={createTestUser} 
        disabled={creating}
        variant="outline"
        className="w-full bg-transparent"
      >
        {creating ? 'Criando...' : 'Criar Conta de Teste'}
      </Button>
      
      {result && (
        <div className={`mt-3 p-3 rounded-md flex items-start gap-2 ${
          result.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        }`}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      {result?.success && (
        <div className="mt-3 p-3 rounded-md bg-blue-500/10 text-blue-600 text-sm">
          <p className="font-medium">Credenciais de teste:</p>
          <p className="mt-1">Email: test@financedash.com</p>
          <p>Senha: Test123456</p>
        </div>
      )}
    </div>
  );
}
