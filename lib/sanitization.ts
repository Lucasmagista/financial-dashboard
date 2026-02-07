/**
 * Security Sanitization Library
 * Protects against XSS, SQL Injection, and other security vulnerabilities
 */

import { z } from 'zod';

// XSS Protection - HTML sanitization
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags and encode special characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// SQL Injection Protection - additional layer
// Note: Neon already uses parameterized queries, but this adds extra protection
export function sanitizeSqlString(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous SQL characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multiline comment start
    .replace(/\*\//g, '') // Remove multiline comment end
    .trim();
}

// Email sanitization
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Convert to lowercase and remove whitespace
  return email.toLowerCase().trim();
}

// Phone number sanitization
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '');
}

// URL sanitization
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Ensure URL is safe
  const trimmed = url.trim();
  
  // Only allow http and https protocols
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  return trimmed;
}

// Sanitize object recursively (for JSON payloads)
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {} as T;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeHtml(value) as any;
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map((item: any) =>
            typeof item === 'string' ? sanitizeHtml(item) : sanitizeObject(item)
          ) as any;
        } else {
          sanitized[key] = sanitizeObject(value) as any;
        }
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

// Sanitize transaction description (allow some formatting but prevent XSS)
export function sanitizeDescription(description: string): string {
  if (!description) return '';
  
  // Allow alphanumeric, basic punctuation, and spaces
  // Remove any potential script injection
  return description
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim()
    .substring(0, 500); // Limit length
}

// Sanitize merchant name
export function sanitizeMerchantName(name: string): string {
  if (!name) return '';
  
  // Allow letters, numbers, spaces, hyphens, and basic punctuation
  return name
    .replace(/[^\w\s\-\.,'&]/g, '')
    .trim()
    .substring(0, 255);
}

// Sanitize category name
export function sanitizeCategoryName(name: string): string {
  if (!name) return '';
  
  return name
    .replace(/[^\w\s\-]/g, '')
    .trim()
    .substring(0, 100);
}

// Sanitize tags array
export function sanitizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  
  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.replace(/[^\w\s\-]/g, '').trim())
    .filter(tag => tag.length > 0 && tag.length <= 50)
    .slice(0, 20); // Max 20 tags
}

// Sanitize notes/comments
export function sanitizeNotes(notes: string): string {
  if (!notes) return '';
  
  return sanitizeDescription(notes).substring(0, 1000);
}

// Validate and sanitize UUID
export function sanitizeUuid(uuid: string): string | null {
  if (!uuid) return null;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    return null;
  }
  
  return uuid.toLowerCase();
}

// Sanitize color hex code
export function sanitizeColorHex(color: string): string {
  if (!color) return '#000000';
  
  const hexRegex = /^#?([0-9A-F]{6})$/i;
  const match = color.match(hexRegex);
  
  if (!match) {
    return '#000000';
  }
  
  return `#${match[1].toUpperCase()}`;
}

// Sanitize amount (prevent negative injection)
export function sanitizeAmount(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

// Sanitize date string
export function sanitizeDate(date: string): string | null {
  if (!date) return null;
  
  try {
    const parsed = new Date(date);
    
    if (isNaN(parsed.getTime())) {
      return null;
    }
    
    return parsed.toISOString();
  } catch {
    return null;
  }
}

// Generic sanitizer with type checking
export function sanitize(value: any, type: 'string' | 'email' | 'url' | 'html' | 'uuid' | 'amount' | 'date'): any {
  switch (type) {
    case 'string':
      return typeof value === 'string' ? sanitizeHtml(value) : '';
    case 'email':
      return typeof value === 'string' ? sanitizeEmail(value) : '';
    case 'url':
      return typeof value === 'string' ? sanitizeUrl(value) : '';
    case 'html':
      return typeof value === 'string' ? sanitizeHtml(value) : '';
    case 'uuid':
      return typeof value === 'string' ? sanitizeUuid(value) : null;
    case 'amount':
      return sanitizeAmount(value);
    case 'date':
      return typeof value === 'string' ? sanitizeDate(value) : null;
    default:
      return value;
  }
}

// Zod transform helpers for schemas
export const zodSanitizers = {
  html: z.string().transform(sanitizeHtml),
  description: z.string().transform(sanitizeDescription),
  merchantName: z.string().transform(sanitizeMerchantName),
  categoryName: z.string().transform(sanitizeCategoryName),
  email: z.string().email().transform(sanitizeEmail),
  url: z.string().url().transform(sanitizeUrl),
  uuid: z.string().uuid().transform(uuid => sanitizeUuid(uuid) || ''),
  colorHex: z.string().transform(sanitizeColorHex),
  notes: z.string().transform(sanitizeNotes),
  tags: z.array(z.string()).transform(sanitizeTags),
};

// Dangerous pattern detection
export function containsDangerousPattern(input: string): boolean {
  if (!input) return false;
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

// Log sanitization - remove sensitive data from logs
export function sanitizeForLog(data: any): any {
  if (!data) return data;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'cookie', 'session', 'password_hash'];
  
  if (typeof data === 'object') {
    const sanitized: any = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = sanitizeForLog(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    }
    
    return sanitized;
  }
  
  return data;
}
