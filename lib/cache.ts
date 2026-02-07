// Redis Cache Layer using Upstash
// High-performance caching for database queries

import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Initialize Upstash Redis only when credentials exist; otherwise fall back to memory cache
const hasRedisEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
let redis: Redis | null = null;

if (hasRedisEnv) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (error) {
    logger.error('Failed to initialize Redis cache, falling back to memory', error);
  }
} else {
  logger.warn('Upstash Redis env vars are missing; using in-memory cache');
}

// In-memory fallback store with TTL tracking
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  USER_DATA: 300, // 5 minutes
  ACCOUNTS: 180, // 3 minutes
  TRANSACTIONS: 120, // 2 minutes
  CATEGORIES: 600, // 10 minutes
  BUDGETS: 300, // 5 minutes
  GOALS: 300, // 5 minutes
  ANALYTICS: 180, // 3 minutes
  OPEN_FINANCE: 60, // 1 minute
} as const;

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  accounts: (userId: string) => `accounts:${userId}`,
  accountBalance: (accountId: string) => `account:${accountId}:balance`,
  transactions: (userId: string, limit: number, offset: number) => 
    `transactions:${userId}:${limit}:${offset}`,
  transactionsByDate: (userId: string, startDate: string, endDate: string) => 
    `transactions:${userId}:${startDate}:${endDate}`,
  categories: (userId: string) => `categories:${userId}`,
  budgets: (userId: string) => `budgets:${userId}`,
  goals: (userId: string) => `goals:${userId}`,
  totalBalance: (userId: string) => `balance:total:${userId}`,
  incomeExpenses: (userId: string, months: number) => 
    `analytics:income-expenses:${userId}:${months}`,
  categoryBreakdown: (userId: string, type: string) => 
    `analytics:category:${userId}:${type}`,
  openFinanceConnections: (userId: string) => `open-finance:${userId}`,
};

// Generic cache get/set functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const data = await redis.get(key);
      if (data !== null && data !== undefined) {
        logger.debug('cache hit (redis)', { key });
        return parseRedisValue<T>(data);
      }
      logger.debug('cache miss (redis)', { key });
    } catch (error) {
      logger.error('cache get error (redis)', error, { key });
    }
  }

  const entry = memoryCache.get(key);
  const now = Date.now();
  if (entry && entry.expiresAt > now) {
    logger.debug('cache hit (memory)', { key });
    return entry.value as T;
  }

  // Cleanup expired entries lazily
  if (entry && entry.expiresAt <= now) {
    memoryCache.delete(key);
  }

  logger.debug('cache miss (memory)', { key });
  return null;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  if (redis) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      logger.debug('cache set (redis)', { key, ttl });
      return;
    } catch (error) {
      logger.error('cache set error (redis)', error, { key });
    }
  }

  memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  logger.debug('cache set (memory)', { key, ttl });
}

export async function cacheDel(key: string | string[]): Promise<void> {
  if (redis) {
    try {
      if (Array.isArray(key)) {
        await redis.del(...key);
        logger.debug('cache del (redis)', { count: key.length });
      } else {
        await redis.del(key);
        logger.debug('cache del (redis)', { key });
      }
      return;
    } catch (error) {
      logger.error('cache del error (redis)', error, { key });
    }
  }

  if (Array.isArray(key)) {
    key.forEach((k) => memoryCache.delete(k));
    logger.debug('cache del (memory)', { count: key.length });
  } else {
    memoryCache.delete(key);
    logger.debug('cache del (memory)', { key });
  }
}

// Invalidate user-specific caches
export async function invalidateUserCache(userId: string): Promise<void> {
  const keys = [
    cacheKeys.user(userId),
    cacheKeys.accounts(userId),
    cacheKeys.categories(userId),
    cacheKeys.budgets(userId),
    cacheKeys.goals(userId),
    cacheKeys.totalBalance(userId),
    cacheKeys.openFinanceConnections(userId),
  ];
  
  // Also invalidate all transaction and analytics caches for this user
  if (redis) {
    const pattern = `*:${userId}:*`;
    const allKeys = await redis.keys(pattern);
    await cacheDel([...keys, ...allKeys]);
    logger.info('cache invalidated for user', { userId, keys: keys.length, pattern });
    return;
  }

  // Memory fallback: remove matching keys
  const extraKeys: string[] = [];
  for (const key of memoryCache.keys()) {
    if (key.includes(`:${userId}:`)) {
      extraKeys.push(key);
    }
  }
  await cacheDel([...keys, ...extraKeys]);
  logger.info('cache invalidated for user (memory)', { userId, keys: keys.length, extra: extraKeys.length });
}

// Cache wrapper for database queries
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch from database
  const data = await fetchFn();

  // Store in cache
  await cacheSet(key, data, ttl);

  return data;
}

// Health check
export async function cacheHealthCheck(): Promise<boolean> {
  if (redis) {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('redis health check failed', error);
      return false;
    }
  }

  // Memory cache is always "healthy"
  return true;
}

function parseRedisValue<T>(data: unknown): T {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }
  return data as T;
}
