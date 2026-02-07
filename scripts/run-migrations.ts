// Database Migration Runner
// Executes SQL migrations in order and tracks applied versions

import { sql } from '../lib/db';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(20) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  
  const result = await sql`
    SELECT version FROM schema_migrations ORDER BY version
  `;
  
  return result.map((row: any) => row.version);
}

async function runMigration(filePath: string, version: string, name: string) {
  console.log(`[v0] Running migration ${version}: ${name}`);
  
  const sqlContent = readFileSync(filePath, 'utf-8');
  
  // Execute migration
  await sql.unsafe(sqlContent);
  
  // Record applied migration
  await sql`
    INSERT INTO schema_migrations (version, name, executed_at)
    VALUES (${version}, ${name}, NOW())
    ON CONFLICT (version) DO NOTHING
  `;

  console.log(`[v0] Migration ${version} completed successfully`);
}

async function main() {
  try {
    console.log('[v0] Starting database migrations...');
    
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    const appliedMigrations = await getAppliedMigrations();
    console.log(`[v0] Applied migrations: ${appliedMigrations.length}`);
    
    for (const file of migrationFiles) {
      const [version, ...nameParts] = file.replace('.sql', '').split('_');
      const name = nameParts.join('_');
      
      if (appliedMigrations.includes(version)) {
        console.log(`[v0] Skipping migration ${version}: ${name} (already applied)`);
        continue;
      }
      
      const filePath = join(migrationsDir, file);
      await runMigration(filePath, version, name);
    }
    
    console.log('[v0] All migrations completed successfully');
  } catch (error) {
    console.error('[v0] Migration error:', error);
    process.exit(1);
  }
}

main();
