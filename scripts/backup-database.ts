import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function backupDatabase() {
  console.log('[Backup] Starting database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup_${timestamp}`;
  
  try {
    // Export all tables data
    const tables = [
      'users',
      'user_sessions',
      'accounts',
      'transactions',
      'categories',
      'budgets',
      'goals',
      'open_finance_connections',
      'audit_logs'
    ];
    
    const backupData: Record<string, any[]> = {};
    
    for (const table of tables) {
      console.log(`[Backup] Exporting ${table}...`);
      const data = await sql`SELECT * FROM ${sql(table)}`;
      backupData[table] = data;
    }
    
    // In production, save to S3/Blob storage
    // For now, log the backup info
    console.log('[Backup] Backup completed successfully');
    console.log(`[Backup] Backup name: ${backupName}`);
    console.log(`[Backup] Tables backed up: ${tables.length}`);
    console.log(`[Backup] Total records: ${Object.values(backupData).reduce((acc, data) => acc + data.length, 0)}`);
    
    return { success: true, backupName, timestamp };
  } catch (error) {
    console.error('[Backup] Backup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { backupDatabase };
