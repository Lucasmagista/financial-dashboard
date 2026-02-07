'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
            </p>

            {error.digest && (
              <p className="text-xs text-muted-foreground mb-4">
                Código do erro: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          </Card>
        </div>
      </body>
    </html>
  );
}
