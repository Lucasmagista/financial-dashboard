-- Migration: Add new tables for advanced features
-- Date: 2026-01-31

-- 1. Transaction receipts table
CREATE TABLE IF NOT EXISTS transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transaction_receipts_transaction_id ON transaction_receipts(transaction_id);
CREATE INDEX idx_transaction_receipts_uploaded_at ON transaction_receipts(uploaded_at);

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('alert', 'info', 'success', 'warning')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 3. Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- 4. Saved reports table
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX idx_saved_reports_updated_at ON saved_reports(updated_at DESC);

-- 5. Dashboard layouts table
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);

-- 6. Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_number VARCHAR(20),
  budget_alerts BOOLEAN DEFAULT TRUE,
  goal_alerts BOOLEAN DEFAULT TRUE,
  large_transaction_alerts BOOLEAN DEFAULT TRUE,
  monthly_report BOOLEAN DEFAULT TRUE,
  weekly_digest BOOLEAN DEFAULT FALSE,
  open_finance_sync BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- 7. Update recurring_transactions table if not exists
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  notes TEXT,
  tags TEXT[],
  auto_create BOOLEAN DEFAULT TRUE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX idx_recurring_transactions_is_active ON recurring_transactions(is_active);

-- 8. Add search vector column to transactions if not exists (for full-text search)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE transactions ADD COLUMN search_vector tsvector;
    
    -- Create index for full-text search
    CREATE INDEX idx_transactions_search_vector ON transactions USING GIN(search_vector);
    
    -- Create trigger to automatically update search_vector
    CREATE OR REPLACE FUNCTION transactions_search_trigger() RETURNS trigger AS $search$
    BEGIN
      NEW.search_vector := 
        setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
      RETURN NEW;
    END;
    $search$ LANGUAGE plpgsql;
    
    CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
    ON transactions FOR EACH ROW EXECUTE FUNCTION transactions_search_trigger();
    
    -- Update existing rows
    UPDATE transactions SET search_vector = 
      setweight(to_tsvector('portuguese', coalesce(description, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(notes, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(array_to_string(tags, ' '), '')), 'C');
  END IF;
END $$;

-- 9. Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Comments
COMMENT ON TABLE transaction_receipts IS 'Stores receipt files for transactions';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions';
COMMENT ON TABLE saved_reports IS 'User-saved custom report configurations';
COMMENT ON TABLE dashboard_layouts IS 'User-customized dashboard widget layouts';
COMMENT ON TABLE notification_preferences IS 'User notification channel preferences';
COMMENT ON TABLE recurring_transactions IS 'Template for automatically creating recurring transactions';
COMMENT ON TABLE audit_logs IS 'Audit trail for important actions';

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
