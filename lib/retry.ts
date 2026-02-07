// Retry logic with exponential backoff
// For resilient API calls and database operations

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  onRetry: () => {},
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxAttempts) {
        logger.error('Retry failed', error, { attempts: attempt });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      logger.warn('Scheduling retry', {
        attempt,
        maxAttempts: opts.maxAttempts,
        delay,
      });

      opts.onRetry(attempt, lastError);

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry specifically for network requests
 */
export async function withRetryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);
    
    // Retry on 5xx errors and specific 4xx errors
    if (response.status >= 500 || response.status === 429 || response.status === 408) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }, options);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Database errors that are retryable
  const retryableCodes = [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '55P03', // lock_not_available
    '57P03', // cannot_connect_now
  ];

  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  return false;
}
