'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Category, Account } from '@/lib/db';

interface TransactionFiltersProps {
  categories: Category[];
  accounts: Account[];
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  type: string;
  categoryId: string;
  accountId: string;
  startDate?: Date;
  endDate?: Date;
  minAmount: string;
  maxAmount: string;
  search: string;
}

export function TransactionFilters({
  categories,
  accounts,
  onFilterChange,
}: TransactionFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    type: 'all',
    categoryId: 'all',
    accountId: 'all',
    minAmount: '',
    maxAmount: '',
    search: '',
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const updateFilters = (key: keyof FilterValues, value: string | Date | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterValues = {
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      minAmount: '',
      maxAmount: '',
      search: '',
    };
    setFilters(emptyFilters);
    setStartDate(undefined);
    setEndDate(undefined);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.accountId !== 'all' ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.search ||
    startDate ||
    endDate;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        {/* Type Filter */}
        <Select value={filters.type} onValueChange={(v) => updateFilters('type', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={filters.categoryId} onValueChange={(v) => updateFilters('categoryId', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Account Filter */}
        <Select value={filters.accountId} onValueChange={(v) => updateFilters('accountId', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Contas</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-transparent">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate && endDate
                ? `${format(startDate, 'dd/MM/yy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yy', { locale: ptBR })}`
                : 'Período'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Data Inicial</p>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    updateFilters('startDate', date);
                  }}
                  locale={ptBR}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Data Final</p>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    updateFilters('endDate', date);
                  }}
                  locale={ptBR}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Amount Range and Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Valor mínimo"
          type="number"
          value={filters.minAmount}
          onChange={(e) => updateFilters('minAmount', e.target.value)}
          className="w-[140px]"
        />
        <span className="text-muted-foreground">até</span>
        <Input
          placeholder="Valor máximo"
          type="number"
          value={filters.maxAmount}
          onChange={(e) => updateFilters('maxAmount', e.target.value)}
          className="w-[140px]"
        />
        <Input
          placeholder="Buscar descrição..."
          value={filters.search}
          onChange={(e) => updateFilters('search', e.target.value)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
