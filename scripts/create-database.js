const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🗄️  Criando banco de dados FinanceDash...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    console.log('📝 Criando tabelas...');
    const sqlPath = path.join(__dirname, 'setup-production-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Tabelas criadas com sucesso!\n');

    // Verificar tabelas criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Tabelas criadas no banco de dados:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ✅ ${row.table_name}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Banco de dados configurado com sucesso!\n');
    console.log('🚀 Próximos passos:');
    console.log('   1. Execute: pnpm dev');
    console.log('   2. Acesse: http://localhost:3000');
    console.log('   3. Crie sua conta no app\n');

  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
    console.error('\n📋 Detalhes do erro:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
