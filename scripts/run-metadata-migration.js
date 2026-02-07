// Run metadata migration using pg client
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Client } = require('pg');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '2026-02-01-add-transaction-metadata.sql'), 'utf8');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration applied');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
