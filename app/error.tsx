'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h1>
        <p className="text-muted-foreground mb-6">
          Encontramos um problema ao processar sua solicitação. Por favor, tente novamente.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-muted p-4 rounded-lg mb-6 text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4">
            ID do erro: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ir para Dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
