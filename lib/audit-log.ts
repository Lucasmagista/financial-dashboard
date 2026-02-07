// Audit logging system for security and compliance
// Tracks all sensitive operations in the system

import { sql } from './db';
import { logger } from './logger';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.update'
  | 'user.delete'
  | 'account.create'
  | 'account.update'
  | 'account.delete'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'open_finance.connect'
  | 'open_finance.disconnect'
  | 'open_finance.sync'
  | 'open_finance.error'
  | 'settings.update'
  | 'password.reset'
  | 'email.verify';

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Create audit log table if it doesn't exist
 */
export async function ensureAuditTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Backfill columns for older databases
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255)`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB`;
  await sql`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE audit_logs ALTER COLUMN success DROP DEFAULT`;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
  `;
}

/**
 * Log an audit entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await ensureAuditTable();

    await sql`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, details,
        ip_address, user_agent, success, error_message
      ) VALUES (
        ${entry.userId},
        ${entry.action},
        ${entry.entityType || null},
        ${entry.entityId || null},
        ${JSON.stringify(entry.details || {})},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.success},
        ${entry.errorMessage || null}
      )
    `;

    logger.info('Audit log recorded', {
      action: entry.action,
      userId: entry.userId,
      success: entry.success,
    });
  } catch (error) {
    logger.error('Failed to write audit log', error, {
      action: entry.action,
      userId: entry.userId,
    });
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  await ensureAuditTable();

  const result = await sql`
    SELECT * FROM audit_logs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

/**
 * Get failed login attempts
 */
export async function getFailedLoginAttempts(
  ipAddress: string,
  since: Date
): Promise<number> {
  await ensureAuditTable();

  const result = await sql`
    SELECT COUNT(*) as count
    FROM audit_logs
    WHERE action = 'user.login'
      AND success = false
      AND ip_address = ${ipAddress}
      AND created_at >= ${since.toISOString()}
  `;

  return Number(result[0]?.count || 0);
}

/**
 * Clean old audit logs (keep last 90 days)
 */
export async function cleanOldAuditLogs(): Promise<void> {
  await ensureAuditTable();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  await sql`
    DELETE FROM audit_logs
    WHERE created_at < ${ninetyDaysAgo.toISOString()}
  `;

  logger.info('Cleaned old audit logs', { olderThanDays: 90 });
}

// Alias export for compatibility with different import patterns
export const logAuditEvent = logAudit;

// Export alias for compatibility
;
