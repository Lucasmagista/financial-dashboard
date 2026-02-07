-- Financial Dashboard Database Schema
-- Complete PostgreSQL schema for personal finance management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account types: checking, savings, credit_card, investment
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
  balance DECIMAL(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'BRL',
  bank_name VARCHAR(255),
  bank_code VARCHAR(50),
  account_number VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(7) DEFAULT '#3b82f6',
  open_finance_id VARCHAR(255), -- ID from Open Finance integration
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  color VARCHAR(7) DEFAULT '#6b7280',
  icon VARCHAR(50),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT,
  transaction_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20), -- daily, weekly, monthly, yearly
  tags TEXT[],
  notes TEXT,
  status VARCHAR(50),
  provider_code VARCHAR(100),
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  mcc VARCHAR(10),
  bank_category VARCHAR(255),
  open_finance_id VARCHAR(255), -- ID from Open Finance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold DECIMAL(5, 2) DEFAULT 80.00, -- Alert when 80% spent
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0.00,
  target_date DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Open Finance connections (for future integration)
CREATE TABLE IF NOT EXISTS open_finance_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_name VARCHAR(255) NOT NULL,
  institution_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  consent_id VARCHAR(255),
  expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Insert default demo user
INSERT INTO users (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@financeiro.com', 'Usuário Demo')
ON CONFLICT (email) DO NOTHING;

-- Insert default categories for demo user
INSERT INTO categories (user_id, name, type, color, icon) VALUES
('00000000-0000-0000-0000-000000000001', 'Salário', 'income', '#10b981', 'Briefcase'),
('00000000-0000-0000-0000-000000000001', 'Freelance', 'income', '#3b82f6', 'Code'),
('00000000-0000-0000-0000-000000000001', 'Investimentos', 'income', '#8b5cf6', 'TrendingUp'),
('00000000-0000-0000-0000-000000000001', 'Alimentação', 'expense', '#ef4444', 'Utensils'),
('00000000-0000-0000-0000-000000000001', 'Transporte', 'expense', '#f59e0b', 'Car'),
('00000000-0000-0000-0000-000000000001', 'Moradia', 'expense', '#6366f1', 'Home'),
('00000000-0000-0000-0000-000000000001', 'Saúde', 'expense', '#ec4899', 'Heart'),
('00000000-0000-0000-0000-000000000001', 'Educação', 'expense', '#14b8a6', 'GraduationCap'),
('00000000-0000-0000-0000-000000000001', 'Lazer', 'expense', '#a855f7', 'PartyPopper'),
('00000000-0000-0000-0000-000000000001', 'Compras', 'expense', '#f97316', 'ShoppingBag')
ON CONFLICT DO NOTHING;

-- Insert sample accounts
INSERT INTO accounts (user_id, name, account_type, balance, bank_name, color) VALUES
('00000000-0000-0000-0000-000000000001', 'Conta Corrente Nubank', 'checking', 5420.50, 'Nubank', '#8b5cf6'),
('00000000-0000-0000-0000-000000000001', 'Poupança Itaú', 'savings', 12350.00, 'Itaú', '#f97316'),
('00000000-0000-0000-0000-000000000001', 'Cartão Inter', 'credit_card', -850.30, 'Inter', '#f59e0b'),
('00000000-0000-0000-0000-000000000001', 'Investimentos XP', 'investment', 25600.00, 'XP Investimentos', '#10b981')
ON CONFLICT DO NOTHING;

-- Insert sample transactions (last 30 days)
INSERT INTO transactions (user_id, account_id, category_id, amount, type, description, transaction_date) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  a.id,
  c.id,
  CASE 
    WHEN c.type = 'income' THEN (random() * 3000 + 1000)::DECIMAL(15,2)
    ELSE -(random() * 500 + 50)::DECIMAL(15,2)
  END,
  c.type,
  c.name || ' - ' || to_char(CURRENT_DATE - (random() * 30)::int, 'DD/MM'),
  CURRENT_DATE - (random() * 30)::int
FROM accounts a
CROSS JOIN categories c
WHERE a.user_id = '00000000-0000-0000-0000-000000000001'
  AND c.user_id = '00000000-0000-0000-0000-000000000001'
LIMIT 50
ON CONFLICT DO NOTHING;
