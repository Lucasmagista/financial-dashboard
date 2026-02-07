'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  ArrowLeft, 
  TrendingUp, 
  Wallet, 
  PieChart,
  Settings,
  Search,
  Clock,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const popularPages = [
  { href: '/', label: 'Dashboard', icon: Home, description: 'Visão geral financeira' },
  { href: '/transactions', label: 'Transações', icon: TrendingUp, description: 'Histórico completo' },
  { href: '/accounts', label: 'Contas', icon: Wallet, description: 'Gerenciar contas' },
  { href: '/reports', label: 'Relatórios', icon: PieChart, description: 'Análises detalhadas' },
];

const recentPages = [
  { href: '/settings', label: 'Configurações', icon: Settings },
  { href: '/goals', label: 'Metas', icon: Sparkles },
];

export default function NotFound() {
  const [mounted, setMounted] = useState(true);
  const [particles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 10,
    }))
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 overflow-hidden">
      {/* Partículas animadas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-primary/10 rounded-full animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern de fundo */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

      <div className="max-w-5xl w-full relative z-10">
        {/* Número 404 grande e estilizado */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 
              className={`text-[180px] md:text-[280px] font-black leading-none bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent transition-all duration-1000 ${
                mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              404
            </h1>
            <div className="absolute inset-0 blur-3xl bg-primary/20 -z-10 animate-pulse" />
          </div>
        </div>

        <Card 
          className={`p-8 md:p-12 shadow-2xl border-primary/20 backdrop-blur-sm bg-background/95 transition-all duration-700 delay-200 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 animate-pulse-slow">
                  <Search className="h-16 w-16 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-destructive-foreground text-xs font-bold">!</span>
                </div>
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Oops! Página não encontrada
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
              A página que você está procurando não existe, foi movida ou está temporariamente indisponível.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Mas não se preocupe, vamos ajudá-lo a encontrar o que precisa! 🚀
            </p>
          </div>

          {/* Botões principais */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button 
              variant="default" 
              size="lg" 
              className="group shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              asChild
            >
              <Link href="/">
                <Home className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                Voltar ao Dashboard
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="group border-primary/20 hover:border-primary/40 hover:scale-105 transition-all duration-300"
              asChild
            >
              <Link href="/transactions">
                <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Ver Transações
              </Link>
            </Button>
          </div>

          <Separator className="my-8" />

          {/* Páginas populares */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Páginas Populares</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularPages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={`group p-4 rounded-lg border border-border hover:border-primary/50 bg-card hover:bg-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                      mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                    }`}
                    style={{ transitionDelay: `${300 + index * 100}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium group-hover:text-primary transition-colors">
                          {page.label}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {page.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Acesso Rápido</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentPages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-primary/50 bg-card hover:bg-accent/50 text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                    }`}
                    style={{ transitionDelay: `${700 + index * 100}ms` }}
                  >
                    <Icon className="h-4 w-4" />
                    {page.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Rodapé informativo */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato com o{' '}
              <Link href="/settings" className="text-primary hover:underline font-medium">
                suporte
              </Link>
              {' '}ou verifique a{' '}
              <Link href="/" className="text-primary hover:underline font-medium">
                documentação
              </Link>
              .
            </p>
          </div>
        </Card>

        {/* Código de erro decorativo */}
        <div 
          className={`mt-6 text-center text-xs font-mono text-muted-foreground/50 transition-all duration-1000 delay-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
        >
          ERROR_CODE: PAGE_NOT_FOUND • TIMESTAMP: {new Date().toISOString()}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
