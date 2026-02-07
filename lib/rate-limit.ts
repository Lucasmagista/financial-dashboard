/**
 * Advanced Rate Limiting with Redis (Production-ready)
 * 
 * This module provides distributed rate limiting using Upstash Redis.
 * Falls back to in-memory rate limiting if Redis is unavailable.
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit, RateLimitTier } from '@/lib/rate-limit';
 * 
 * const allowed = await checkRateLimit(userId, RateLimitTier.API);
 * if (!allowed) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */

import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Initialize Redis (optional - falls back to in-memory if not configured)
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  logger.error('Failed to initialize Redis for rate limiting', error);
}

// Rate limit tiers
export enum RateLimitTier {
  API = 'api',           // 30 requests/minute
  AUTH = 'auth',         // 5 requests/minute (strict)
  UPLOAD = 'upload',     // 10 requests/minute
  QUERY = 'query',       // 60 requests/minute
  WRITE = 'write',       // 20 requests/minute
}

// Rate limit configurations
const RATE_LIMITS: Record<RateLimitTier, { requests: number; window: number }> = {
  [RateLimitTier.API]: { requests: 30, window: 60 },      // 30 req/min
  [RateLimitTier.AUTH]: { requests: 5, window: 60 },      // 5 req/min
  [RateLimitTier.UPLOAD]: { requests: 10, window: 60 },   // 10 req/min
  [RateLimitTier.QUERY]: { requests: 60, window: 60 },    // 60 req/min
  [RateLimitTier.WRITE]: { requests: 20, window: 60 },    // 20 req/min
};

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if request is within rate limit
 * @param identifier - User ID, IP address, or other unique identifier
 * @param tier - Rate limit tier to apply
 * @returns true if allowed, false if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = RateLimitTier.API
): Promise<boolean> {
  const key = `ratelimit:${tier}:${identifier}`;
  const config = RATE_LIMITS[tier];

  if (redis) {
    try {
      return await checkRateLimitRedis(key, config.requests, config.window);
    } catch (error) {
      logger.warn('Redis rate limit check failed, using memory fallback', error);
      // Fall through to memory-based rate limiting
    }
  }

  return checkRateLimitMemory(key, config.requests, config.window);
}

/**
 * Redis-based rate limiting (distributed, production-ready)
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  if (!redis) return true;

  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Use Redis sorted set for sliding window
  const pipeline = redis.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Count current requests
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  
  // Set expiry
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const currentCount = results[1] as number;

  return currentCount < maxRequests;
}

/**
 * Memory-based rate limiting (fallback, single-instance only)
 */
function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowSeconds: number
): boolean {
  const now = Date.now();
  const limit = memoryStore.get(key);

  if (!limit || now > limit.resetTime) {
    // Reset window
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Get rate limit info for a user
 */
export async function getRateLimitInfo(
  identifier: string,
  tier: RateLimitTier = RateLimitTier.API
): Promise<{ limit: number; remaining: number; reset: number }> {
  const key = `ratelimit:${tier}:${identifier}`;
  const config = RATE_LIMITS[tier];

  if (redis) {
    try {
      const now = Date.now();
      const windowStart = now - config.window * 1000;
      
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key);
      
      return {
        limit: config.requests,
        remaining: Math.max(0, config.requests - count),
        reset: now + config.window * 1000,
      };
    } catch (error) {
      logger.error('Failed to get rate limit info', error, { identifier, tier });
    }
  }

  // Fallback to memory
  const limit = memoryStore.get(key);
  const now = Date.now();

  if (!limit || now > limit.resetTime) {
    return {
      limit: config.requests,
      remaining: config.requests,
      reset: now + config.window * 1000,
    };
  }

  return {
    limit: config.requests,
    remaining: Math.max(0, config.requests - limit.count),
    reset: limit.resetTime,
  };
}

/**
 * Reset rate limit for a user (admin function)
 */
export async function resetRateLimit(
  identifier: string,
  tier?: RateLimitTier
): Promise<void> {
  if (tier) {
    const key = `ratelimit:${tier}:${identifier}`;
    if (redis) {
      await redis.del(key);
    }
    memoryStore.delete(key);
  } else {
    // Reset all tiers
    for (const tierKey of Object.values(RateLimitTier)) {
      const key = `ratelimit:${tierKey}:${identifier}`;
      if (redis) {
        await redis.del(key);
      }
      memoryStore.delete(key);
    }
  }
}

/**
 * Clean up old entries from memory store (call periodically)
 */
export function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, limit] of memoryStore.entries()) {
    if (now > limit.resetTime) {
      memoryStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000);
}
