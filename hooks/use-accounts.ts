'use client';

import useSWR from 'swr';
import type { Account } from '@/lib/db';

interface AccountsResponse {
  accounts: Account[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function useAccounts() {
  const { data, error, mutate, isLoading } = useSWR<AccountsResponse>(
    '/api/accounts',
    fetcher,
    {
      refreshInterval: 60000, // Atualiza a cada 60s
      revalidateOnFocus: true,
    }
  );

  return {
    accounts: data?.accounts || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAccount(id: string) {
  const { data, error, mutate, isLoading } = useSWR<{ account: Account }>(
    id ? `/api/accounts/${id}` : null,
    fetcher
  );

  return {
    account: data?.account,
    isLoading,
    isError: error,
    mutate,
  };
}
