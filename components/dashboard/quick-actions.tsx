'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ArrowUpDown, Target, PiggyBank } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent" asChild>
          <Link href="/transactions?action=add">
            <Plus className="h-5 w-5" />
            <span className="text-sm">Nova Transação</span>
          </Link>
        </Button>
        
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent" asChild>
          <Link href="/transactions?action=transfer">
            <ArrowUpDown className="h-5 w-5" />
            <span className="text-sm">Transferência</span>
          </Link>
        </Button>
        
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent" asChild>
          <Link href="/?action=add-budget">
            <Target className="h-5 w-5" />
            <span className="text-sm">Novo Orçamento</span>
          </Link>
        </Button>
        
        <Button variant="outline" className="h-auto py-4 flex-col gap-2 bg-transparent" asChild>
          <Link href="/?action=add-goal">
            <PiggyBank className="h-5 w-5" />
            <span className="text-sm">Nova Meta</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
