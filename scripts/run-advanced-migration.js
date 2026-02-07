#!/usr/bin/env node

/**
 * Script to run database migration for advanced features
 * Run with: node scripts/run-advanced-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  require('dotenv').config();
}

async function runMigration() {
  console.log('\n🚀 Running Advanced Features Migration...\n');

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL or POSTGRES_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_advanced_features.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Reading migration file...');
    console.log(`📁 Path: ${migrationPath}\n`);

    // Execute migration
    console.log('⚙️  Executing migration...\n');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Tables created:');
    console.log('   • transaction_receipts');
    console.log('   • notifications');
    console.log('   • push_subscriptions');
    console.log('   • saved_reports');
    console.log('   • dashboard_layouts');
    console.log('   • notification_preferences');
    console.log('   • recurring_transactions');
    console.log('   • audit_logs\n');

    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'transaction_receipts', 
        'notifications', 
        'push_subscriptions',
        'saved_reports',
        'dashboard_layouts',
        'notification_preferences',
        'recurring_transactions',
        'audit_logs'
      )
      ORDER BY table_name
    `);

    console.log('🔍 Verification:');
    console.log(`   Found ${result.rows.length}/8 tables\n`);

    if (result.rows.length === 8) {
      console.log('🎉 All tables created successfully!\n');
    } else {
      console.log('⚠️  Warning: Some tables might not have been created.');
      console.log('   Tables found:', result.rows.map(r => r.table_name).join(', '));
      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:\n');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
