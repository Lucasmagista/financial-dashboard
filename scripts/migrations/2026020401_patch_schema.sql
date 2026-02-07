-- Migration 2026020401: Patch schema to current app needs
-- Safe, idempotent ALTERs to bring legacy databases up to date.

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users: add auth fields
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts: ensure columns used by Open Finance
ALTER TABLE IF EXISTS accounts
  ADD COLUMN IF NOT EXISTS open_finance_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS open_finance_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';

-- Transactions: ensure metadata columns exist
ALTER TABLE IF EXISTS transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mcc VARCHAR(10),
  ADD COLUMN IF NOT EXISTS bank_category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Full-text index for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_search_vector ON transactions USING GIN(search_vector);

-- Open Finance connections: align with app usage
CREATE TABLE IF NOT EXISTS open_finance_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  institution_name VARCHAR(255) NOT NULL,
  institution_id VARCHAR(255),
  item_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  status VARCHAR(50) DEFAULT 'active',
  consent_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE open_finance_connections
  ALTER COLUMN status SET DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_open_finance_item_id ON open_finance_connections(item_id);
CREATE INDEX IF NOT EXISTS idx_open_finance_user_status ON open_finance_connections(user_id, status);

-- Audit logs: ensure columns used by UI and logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Mark migration applied
INSERT INTO schema_migrations (version, name, executed_at)
VALUES ('2026020401', 'patch_schema', NOW())
ON CONFLICT (version) DO NOTHING;
