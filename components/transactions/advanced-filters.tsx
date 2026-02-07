'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';

interface AdvancedFiltersProps {
  categories: Array<{ id: string; name: string; }>;
  accounts: Array<{ id: string; name: string; }>;
  onFilterChange: (filters: any) => void;
}

export function AdvancedFilters({ categories, accounts, onFilterChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    categoryId: '',
    accountId: '',
    type: '',
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const addTag = () => {
    if (currentTag && !filters.tags.includes(currentTag)) {
      const newTags = [...filters.tags, currentTag];
      handleFilterChange('tags', newTags);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = filters.tags.filter(t => t !== tag);
    handleFilterChange('tags', newTags);
  };

  const applyFilters = () => {
    const active: string[] = [];
    
    if (filters.search) active.push(`Busca: ${filters.search}`);
    if (filters.startDate) active.push(`De: ${new Date(filters.startDate).toLocaleDateString()}`);
    if (filters.endDate) active.push(`Até: ${new Date(filters.endDate).toLocaleDateString()}`);
    if (filters.minAmount) active.push(`Min: R$ ${filters.minAmount}`);
    if (filters.maxAmount) active.push(`Max: R$ ${filters.maxAmount}`);
    if (filters.categoryId) {
      const cat = categories.find(c => c.id === filters.categoryId);
      if (cat) active.push(`Categoria: ${cat.name}`);
    }
    if (filters.accountId) {
      const acc = accounts.find(a => a.id === filters.accountId);
      if (acc) active.push(`Conta: ${acc.name}`);
    }
    if (filters.type) active.push(`Tipo: ${filters.type === 'income' ? 'Receita' : 'Despesa'}`);
    filters.tags.forEach(tag => active.push(`Tag: ${tag}`));

    setActiveFilters(active);
    onFilterChange(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      categoryId: '',
      accountId: '',
      type: '',
      tags: [],
    };
    setFilters(emptyFilters);
    setActiveFilters([]);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros Avançados
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilters.length}
            </Badge>
          )}
        </Button>

        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary">
              {filter}
            </Badge>
          ))}
        </div>
      )}

      {isOpen && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição, merchant..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label>Valor Mínimo</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Máximo</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={filters.categoryId}
                onValueChange={(value) => handleFilterChange('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select
                value={filters.accountId}
                onValueChange={(value) => handleFilterChange('accountId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" onClick={addTag} size="sm">
                  +
                </Button>
              </div>
              {filters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={applyFilters}>
              Aplicar Filtros
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
