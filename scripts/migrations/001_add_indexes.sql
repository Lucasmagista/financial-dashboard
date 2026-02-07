-- Migration 001: Add Performance Indexes
-- Date: 2026-01-24
-- Description: Add indexes for frequently queried columns to improve performance

-- Create migrations tracking table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
  ON transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category 
  ON transactions(category_id) WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_date 
  ON transactions(account_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_accounts_user_active 
  ON accounts(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_budgets_user_period 
  ON budgets(user_id, period, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_open_finance_user_status 
  ON open_finance_connections(user_id, status) WHERE status = 'active';

-- Add index for recent transactions lookup (without WHERE clause to avoid immutability issues)
CREATE INDEX IF NOT EXISTS idx_transactions_recent 
  ON transactions(user_id, transaction_date DESC);

-- Analyze tables after index creation
ANALYZE transactions;
ANALYZE accounts;
ANALYZE budgets;
ANALYZE open_finance_connections;

-- Log migration
INSERT INTO schema_migrations (version, name, executed_at)
VALUES ('001', 'add_indexes', NOW())
ON CONFLICT (version) DO NOTHING;
