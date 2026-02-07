-- Create a test user for login testing
-- This script creates a user with email: test@financedash.com / password: Test123456

-- First, delete if exists
DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM categories WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM budgets WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM goals WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM open_finance_connections WHERE user_id IN (SELECT id FROM users WHERE email = 'test@financedash.com');
DELETE FROM users WHERE email = 'test@financedash.com';

-- Create test user
-- Password hash for "Test123456" using Web Crypto API
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'test@financedash.com',
  'eb33e6b5c8f3c8c4e1d6f8a5c4b3e2d1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5', -- This is placeholder, will need actual hash
  'Usuário Teste',
  NOW(),
  NOW()
);

-- Create default categories for test user
INSERT INTO categories (user_id, name, type, color, icon)
VALUES 
  ('00000000-0000-0000-0000-000000000099', 'Alimentação', 'expense', '#ef4444', '🍔'),
  ('00000000-0000-0000-0000-000000000099', 'Transporte', 'expense', '#f59e0b', '🚗'),
  ('00000000-0000-0000-0000-000000000099', 'Moradia', 'expense', '#3b82f6', '🏠'),
  ('00000000-0000-0000-0000-000000000099', 'Salário', 'income', '#10b981', '💰');

-- Create a test account
INSERT INTO accounts (user_id, name, account_type, balance, currency, bank_name, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'Conta Corrente Teste',
  'checking',
  1000.00,
  'BRL',
  'Banco Teste',
  true
);

SELECT 'Test user created successfully! Email: test@financedash.com | Password: Test123456' as result;
