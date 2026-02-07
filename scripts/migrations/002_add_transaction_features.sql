-- Migration 002: Add Advanced Transaction Features
-- Date: 2026-01-24
-- Description: Add support for receipts, full-text search, and recurring transactions

-- Add receipt URL column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add full-text search vector
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add recurring transaction fields
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20); -- daily, weekly, monthly, yearly
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_interval INTEGER DEFAULT 1;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_end_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Add AI categorization fields
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auto_categorized BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_transactions_search 
  ON transactions USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_transaction_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.notes, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic search vector update
DROP TRIGGER IF EXISTS trigger_update_transaction_search ON transactions;
CREATE TRIGGER trigger_update_transaction_search
  BEFORE INSERT OR UPDATE OF description, notes ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_search_vector();

-- Create table for recurring transaction templates
CREATE TABLE IF NOT EXISTS recurring_transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_run 
  ON recurring_transaction_templates(user_id, next_run_date, is_active)
  WHERE is_active = true;

-- Update search vectors for existing transactions
UPDATE transactions SET search_vector = 
  setweight(to_tsvector('portuguese', COALESCE(description, '')), 'A') ||
  setweight(to_tsvector('portuguese', COALESCE(notes, '')), 'B')
WHERE search_vector IS NULL;

-- Record migration
INSERT INTO schema_migrations (version, name) 
VALUES ('002', 'add_transaction_features')
ON CONFLICT (version) DO NOTHING;
