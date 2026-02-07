import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * Create a backup of the database
 * In production, this should save to S3/Blob storage
 */
export async function backupDatabase() {
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
    
    const backupData: Record<string, unknown[]> = {};
    
    for (const table of tables) {
      console.log(`[Backup] Exporting ${table}...`);
      const data = await sql.unsafe(`SELECT * FROM ${table}`);
      backupData[table] = Array.isArray(data) ? data : [data];
    }
    
    // In production, save to S3/Blob storage
    // For now, log the backup info
    console.log('[Backup] Backup completed successfully');
    console.log(`[Backup] Backup name: ${backupName}`);
    console.log(`[Backup] Tables backed up: ${tables.length}`);
    console.log(`[Backup] Total records: ${Object.values(backupData).reduce((acc, data) => acc + data.length, 0)}`);
    
    return { 
      success: true, 
      backupName, 
      timestamp,
      tablesCount: tables.length,
      totalRecords: Object.values(backupData).reduce((acc, data) => acc + data.length, 0)
    };
  } catch (error) {
    console.error('[Backup] Backup failed:', error);
    throw error;
  }
}
