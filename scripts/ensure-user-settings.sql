-- Ensure user_settings table exists
-- This migration can be run multiple times safely (idempotent)

-- Create user_settings table if it doesn't exist
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Insert default settings for existing users who don't have settings yet
INSERT INTO user_settings (user_id, created_at, updated_at)
SELECT 
  u.id,
  NOW(),
  NOW()
FROM users u
LEFT JOIN user_settings us ON u.id = us.user_id
WHERE us.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
