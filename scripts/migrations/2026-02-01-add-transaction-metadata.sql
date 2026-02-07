-- Adds Pluggy metadata fields to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_code VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mcc VARCHAR(10);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_category VARCHAR(255);
