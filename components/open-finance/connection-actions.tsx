'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ConnectionActionsProps {
  connectionId: number | string;
  institutionName: string;
}

export function ConnectionActions({ connectionId, institutionName }: ConnectionActionsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSync = async (days: number = 7) => {
    try {
      setIsSyncing(true);
      
      console.log('[v0] Syncing connection:', connectionId, 'Days:', days);
      
      const response = await fetch('/api/open-finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: connectionId,
          force: true,
          days: days,
        }),
      });

      const data = await response.json();
      
      console.log('[v0] Sync response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      toast({
        title: 'Sincronização concluída!',
        description: `${data.accounts_synced || 0} contas e ${data.transactions_synced || 0} transações atualizadas (últimos ${days} dias)`,
      });

      router.refresh();
    } catch (error) {
      console.error('[v0] Sync error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Deseja desconectar ${institutionName}? As contas e transações vinculadas serão desativadas.`)) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch('/api/open-finance/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao desconectar');
      }

      toast({
        title: 'Conexão removida',
        description: `${institutionName} foi desconectado com sucesso`,
      });

      router.refresh();
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast({
        title: 'Erro ao desconectar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
            disabled={isSyncing || isDeleting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Período de Sincronização</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSync(7)}>
            Últimos 7 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync(15)}>
            Últimos 15 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync(30)}>
            Últimos 30 dias
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync(90)}>
            Últimos 90 dias
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isSyncing || isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
