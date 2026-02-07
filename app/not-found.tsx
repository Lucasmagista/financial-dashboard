import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-4">
            <FileQuestion className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
        <p className="text-muted-foreground mb-6">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="default" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Ir para Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ver Transações
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
