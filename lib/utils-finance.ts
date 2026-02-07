export function formatCurrency(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', { 
    month: 'short', 
    day: 'numeric' 
  }).format(d);
}

export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  }).format(d);
}

export function getMonthName(monthNumber: number): string {
  const date = new Date(2024, monthNumber - 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function getStartOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

export function getStartOfYear(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}
