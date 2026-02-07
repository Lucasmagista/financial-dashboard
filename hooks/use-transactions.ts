'use client';

import useSWR from 'swr';
import type { Transaction } from '@/lib/db';

interface TransactionsResponse {
  transactions: Transaction[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function useTransactions(limit = 50) {
  const { data, error, mutate, isLoading } = useSWR<TransactionsResponse>(
    `/api/transactions?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 30000, // Atualiza a cada 30s
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    transactions: data?.transactions || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTransaction(id: string) {
  const { data, error, mutate, isLoading } = useSWR<{ transaction: Transaction }>(
    id ? `/api/transactions/${id}` : null,
    fetcher
  );

  return {
    transaction: data?.transaction,
    isLoading,
    isError: error,
    mutate,
  };
}
