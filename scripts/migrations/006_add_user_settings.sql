-- Migration: Add user_settings table
-- Run this migration to add settings support

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  budget_alerts BOOLEAN DEFAULT true,
  transaction_alerts BOOLEAN DEFAULT true,
  theme VARCHAR(20) DEFAULT 'system',
  language VARCHAR(10) DEFAULT 'pt-br',
  currency VARCHAR(3) DEFAULT 'BRL',
  date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
  week_start VARCHAR(10) DEFAULT 'sunday',
  session_timeout VARCHAR(10) DEFAULT '30',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
