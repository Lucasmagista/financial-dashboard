// Complete Open Finance Integration with Pluggy
// Includes: Token management, retry logic, webhooks, error handling, audit logs

import { sql } from './db';
import { withRetry, withRetryFetch } from './retry';
import { logAudit } from './audit-log';
import { invalidateUserCache } from './cache';
import { logger } from './logger';

const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;
const PLUGGY_API_URL = 'https://api.pluggy.ai';

// Token cache (in-memory, could be moved to Redis)
let cachedApiKey: string | null = null;
let tokenExpiresAt: number = 0;

export interface PluggyError {
  code: string;
  message: string;
  details?: any;
}

export class PluggyAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PluggyAPIError';
  }
}

/**
 * Get Pluggy API access token with caching and retry
 */
export async function getPluggyAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedApiKey && Date.now() < tokenExpiresAt) {
    return cachedApiKey;
  }

  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
    throw new PluggyAPIError(
      'CONFIG_ERROR',
      'Pluggy credentials not configured. Set PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET.'
    );
  }

  return withRetry(
    async () => {
      const response = await fetch(`${PLUGGY_API_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: PLUGGY_CLIENT_ID,
          clientSecret: PLUGGY_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new PluggyAPIError(
          'AUTH_FAILED',
          'Failed to authenticate with Pluggy',
          error
        );
      }

      const data = await response.json();
      cachedApiKey = data.apiKey;
      tokenExpiresAt = Date.now() + 3600000; // 1 hour

      logger.info('Pluggy API token refreshed');
      return data.apiKey;
    },
    { maxAttempts: 3, initialDelay: 1000 }
  );
}

/**
 * Make authenticated request to Pluggy API with retry
 */
async function pluggyRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = await getPluggyAccessToken();

  const response = await withRetryFetch(
    `${PLUGGY_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        logger.warn('Retrying Pluggy request', {
          attempt,
          message: (error as Error)?.message,
          endpoint,
        });
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new PluggyAPIError(
      error.code || 'API_ERROR',
      error.message || 'Pluggy API request failed',
      error
    );
  }

  return response.json();
}

/**
 * List available institutions with search
 */
export async function listInstitutions(searchQuery?: string) {
  let endpoint = '/connectors?countries=BR';
  if (searchQuery) {
    endpoint += `&name=${encodeURIComponent(searchQuery)}`;
  }

  const data = await pluggyRequest<any>(endpoint);
  return data.results || [];
}

/**
 * Create connect token for Pluggy widget
 */
export async function createConnectToken(userId: string) {
  const redirectUrl = process.env.PLUGGY_CONNECT_REDIRECT_URL || process.env.NEXT_PUBLIC_APP_URL;

  const data = await pluggyRequest<any>('/connect_token', {
    method: 'POST',
    body: JSON.stringify({
      clientUserId: userId,
      products: ['open_finance'],
      connectRedirectUrl: redirectUrl,
    }),
  });

  await logAudit({
    userId,
    action: 'open_finance.connect',
    details: { tokenCreated: true },
    success: true,
  });

  return data;
}

/**
 * Save connection after successful Pluggy connect
 */
export async function saveConnection(
  userId: string,
  itemId: string,
  institutionId: string,
  institutionName: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get item details from Pluggy
    const item = await pluggyRequest<any>(`/items/${itemId}`);

    // Save to database
    await sql`
      INSERT INTO open_finance_connections (
        user_id, provider, institution_name, institution_id,
        item_id, status, last_sync_at
      ) VALUES (
        ${userId}, 'pluggy', ${institutionName}, ${institutionId},
        ${itemId}, ${item.status}, NOW()
      )
      ON CONFLICT (item_id)
      DO UPDATE SET
        status = ${item.status},
        last_sync_at = NOW(),
        updated_at = NOW()
    `;

    // Sync accounts and transactions
    await syncConnection(userId, itemId);

    // Invalidate cache
    await invalidateUserCache(userId);

    // Audit log
    await logAudit({
      userId,
      action: 'open_finance.connect',
      entityType: 'connection',
      entityId: itemId,
      details: { institutionName, institutionId },
      ipAddress,
      userAgent,
      success: true,
    });

    logger.info('Open Finance connection saved', {
      userId,
      itemId,
      institutionId,
      institutionName,
    });
    return true;
  } catch (error: any) {
    await logAudit({
      userId,
      action: 'open_finance.connect',
      entityType: 'connection',
      entityId: itemId,
      details: { institutionName, institutionId },
      ipAddress,
      userAgent,
      success: false,
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Sync connection (accounts and transactions)
 */
export async function syncConnection(userId: string, itemId: string) {
  try {
    // Trigger sync on Pluggy
    await pluggyRequest(`/items/${itemId}/sync`, { method: 'POST' });

    // Get accounts
    const accountsData = await pluggyRequest<any>(`/accounts?itemId=${itemId}`);
    const accounts = accountsData.results || [];

    // Save accounts to database
    for (const account of accounts) {
      await sql`
        INSERT INTO accounts (
          user_id, name, account_type, balance, currency,
          open_finance_id, open_finance_provider, last_sync_at
        ) VALUES (
          ${userId},
          ${account.name},
          ${mapAccountType(account.type)},
          ${account.balance},
          ${account.currencyCode},
          ${account.id},
          'pluggy',
          NOW()
        )
        ON CONFLICT (open_finance_id)
        DO UPDATE SET
          balance = ${account.balance},
          last_sync_at = NOW(),
          updated_at = NOW()
      `;

      // Get transactions for this account
      await syncAccountTransactions(userId, account.id);
    }

    // Update connection status
    await sql`
      UPDATE open_finance_connections
      SET last_sync_at = NOW(), status = 'active', error_message = NULL
      WHERE item_id = ${itemId}
    `;

    await logAudit({
      userId,
      action: 'open_finance.sync',
      entityType: 'connection',
      entityId: itemId,
      details: { accountsCount: accounts.length },
      success: true,
    });

    logger.info('Synced accounts for connection', {
      userId,
      itemId,
      accountsCount: accounts.length,
    });
  } catch (error: any) {
    // Update connection with error
    await sql`
      UPDATE open_finance_connections
      SET status = 'error', error_message = ${error.message}
      WHERE item_id = ${itemId}
    `;

    await logAudit({
      userId,
      action: 'open_finance.sync',
      entityType: 'connection',
      entityId: itemId,
      success: false,
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Sync transactions for an account
 */
async function syncAccountTransactions(userId: string, accountId: string) {
  try {
    // Get last 90 days of transactions
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const transactionsData = await pluggyRequest<any>(
      `/transactions?accountId=${accountId}&from=${fromDate}&to=${toDate}`
    );
    const transactions = transactionsData.results || [];

    // Get our internal account ID
    const accountResult = await sql`
      SELECT id FROM accounts WHERE open_finance_id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.length === 0) return;
    const internalAccountId = accountResult[0].id;

    // Save transactions
    for (const txn of transactions) {
      await sql`
        INSERT INTO transactions (
          user_id, account_id, amount, type, description,
          transaction_date, open_finance_id
        ) VALUES (
          ${userId},
          ${internalAccountId},
          ${Math.abs(txn.amount)},
          ${txn.amount < 0 ? 'expense' : 'income'},
          ${txn.description},
          ${txn.date},
          ${txn.id}
        )
        ON CONFLICT (open_finance_id)
        DO NOTHING
      `;
    }

    logger.info('Synced transactions for account', {
      userId,
      accountId,
      transactionCount: transactions.length,
    });
  } catch (error) {
    logger.error('Error syncing transactions for account', error, {
      userId,
      accountId,
    });
  }
}

/**
 * Disconnect Open Finance connection
 */
export async function disconnectConnection(
  userId: string,
  itemId: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Delete from Pluggy
    await pluggyRequest(`/items/${itemId}`, { method: 'DELETE' });

    // Mark accounts as disconnected
    await sql`
      UPDATE accounts
      SET open_finance_id = NULL, open_finance_provider = NULL
      WHERE user_id = ${userId} AND open_finance_id IN (
        SELECT id FROM accounts WHERE open_finance_id IN (
          SELECT id FROM accounts WHERE user_id = ${userId}
        )
      )
    `;

    // Delete connection record
    await sql`
      DELETE FROM open_finance_connections
      WHERE user_id = ${userId} AND item_id = ${itemId}
    `;

    await invalidateUserCache(userId);

    await logAudit({
      userId,
      action: 'open_finance.disconnect',
      entityType: 'connection',
      entityId: itemId,
      ipAddress,
      userAgent,
      success: true,
    });

    logger.info('Disconnected Open Finance connection', {
      userId,
      itemId,
    });
  } catch (error: any) {
    await logAudit({
      userId,
      action: 'open_finance.disconnect',
      entityType: 'connection',
      entityId: itemId,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Map Pluggy account types to our types
 */
function mapAccountType(pluggyType: string): string {
  const mapping: Record<string, string> = {
    CHECKING: 'checking',
    SAVINGS: 'savings',
    CREDIT_CARD: 'credit_card',
    INVESTMENT: 'investment',
  };
  return mapping[pluggyType] || 'other';
}

/**
 * Get all connections for a user
 */
export async function getUserConnections(userId: string) {
  const result = await sql`
    SELECT * FROM open_finance_connections
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return result;
}

/**
 * Get connection status
 */
export async function getConnectionStatus(connectionId: string) {
  const result = await sql`
    SELECT status, last_sync_at, error_message 
    FROM open_finance_connections
    WHERE id = ${connectionId}
    LIMIT 1
  `;

  return result[0] || null;
}

/**
 * Refresh connection token
 */
export async function refreshConnectionToken(connectionId: string) {
  const connection = await sql`
    SELECT pluggy_item_id, access_token 
    FROM open_finance_connections
    WHERE id = ${connectionId}
    LIMIT 1
  `;

  if (!connection[0]) {
    throw new Error('Connection not found');
  }

  // Token refresh would be handled by Pluggy SDK automatically
  // This is a placeholder for manual refresh if needed
  return {
    success: true,
    connectionId,
  };
}
