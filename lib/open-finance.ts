// Open Finance Integration with Pluggy API
// Documentation: https://docs.pluggy.ai

import { getPluggyAccessToken as getCachedPluggyAccessToken } from './open-finance-complete';
import { logger } from './logger';

const PLUGGY_API_URL = 'https://api.pluggy.ai';

export interface PluggyInstitution {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  primaryColor: string;
  country: string;
}

export interface PluggyAccount {
  id: string;
  type: string; // 'BANK', 'CREDIT'
  subtype: string; // 'CHECKING_ACCOUNT', 'SAVINGS_ACCOUNT', 'CREDIT_CARD'
  number?: string;
  name: string;
  balance: number;
  marketingName?: string;
  currencyCode: string;
  itemId: string;
  creditData?: {
    level?: string;
    brand?: string;
    balanceCloseDate?: string;
    balanceDueDate?: string;
    availableCreditLimit?: number;
    balanceForeignCurrency?: number;
    minimumPayment?: number;
    creditLimit?: number;
  };
  bankData?: {
    transferNumber?: string;
    closingBalance?: number;
  };
}

export interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  date: string;
  balance?: number;
  currencyCode?: string;
  category?: string;
  categoryId?: string;
  accountId: string;
  providerCode?: string;
  status?: string;
  type?: string;
  paymentData?: {
    payer?: string;
    receiver?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    documentNumber?: string;
    scheduledFor?: string;
  };
  creditCardMetadata?: {
    payeeDocument?: string;
    instalmentNumber?: number;
    totalInstallments?: number;
    totalAmount?: number;
    payeeName?: string;
    holderDocument?: string;
    mcc?: string;
  };
  location?: string;
  descriptionDetailed?: string;
  counterPartyName?: string;
  counterPartyDocument?: string;
}

export interface PluggyConnectToken {
  accessToken: string;
}

// List available institutions (banks)
export async function listInstitutions(searchQuery?: string): Promise<PluggyInstitution[]> {
  try {
    const apiKey = await getCachedPluggyAccessToken();
    
    let url = `${PLUGGY_API_URL}/connectors?countries=BR`;
    if (searchQuery) {
      url += `&name=${encodeURIComponent(searchQuery)}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch institutions');
    }

    const data = await response.json();
    return data.results as PluggyInstitution[];
  } catch (error) {
    logger.error('Error listing institutions', error, { searchQuery });
    throw error;
  }
}

// Create connect token for Pluggy Connect Widget
export async function createConnectToken(userId: string): Promise<PluggyConnectToken> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const redirectUrl = process.env.PLUGGY_CONNECT_REDIRECT_URL || process.env.NEXT_PUBLIC_APP_URL;
    const products = ['open_finance'];

    const response = await fetch(`${PLUGGY_API_URL}/connect_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        clientUserId: userId,
        products,
        connectRedirectUrl: redirectUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create connect token');
    }

    const data = await response.json();
    return data as PluggyConnectToken;
  } catch (error) {
    logger.error('Error creating connect token', error, { userId });
    throw error;
  }
}

// Get accounts from connected item
export async function getAccounts(itemId: string): Promise<PluggyAccount[]> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const response = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }

    const data = await response.json();
    return data.results as PluggyAccount[];
  } catch (error) {
    logger.error('Error fetching accounts', error, { itemId });
    throw error;
  }
}

// Get transactions from account
export async function getTransactions(
  accountId: string,
  from?: string,
  to?: string,
  pageSize = 500,
  maxPages = 5
): Promise<PluggyTransaction[]> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const all: PluggyTransaction[] = [];
    let page = 1;

    while (page <= maxPages) {
      let url = `${PLUGGY_API_URL}/transactions?accountId=${accountId}&page=${page}&pageSize=${pageSize}`;
      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      const results = (data.results || []) as PluggyTransaction[];
      all.push(...results);

      if (!results.length || results.length < pageSize) break;
      page += 1;
    }

    return all;
  } catch (error) {
    logger.error('Error fetching transactions', error, {
      accountId,
      from,
      to,
      pageSize,
      maxPages,
    });
    throw error;
  }
}

// Sync item (refresh data from bank)
export async function syncItem(itemId: string): Promise<void> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}/sync`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to sync item');
    }
  } catch (error) {
    logger.error('Error syncing item', error, { itemId });
    throw error;
  }
}

// Delete item (disconnect bank)
export async function deleteItem(itemId: string): Promise<void> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete item');
    }
  } catch (error) {
    logger.error('Error deleting item', error, { itemId });
    throw error;
  }
}

// Get item status
export async function getItemStatus(itemId: string): Promise<any> {
  try {
    const apiKey = await getCachedPluggyAccessToken();

    const response = await fetch(`${PLUGGY_API_URL}/items/${itemId}`, {
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch item status');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching item status', error, { itemId });
    throw error;
  }
}
