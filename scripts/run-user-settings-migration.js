const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔄 Executando migration user_settings...\n');
    
    // Read and split SQL file by statements
    const sqlContent = fs.readFileSync('scripts/ensure-user-settings.sql', 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        await sql.query(statement);
      }
    }
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Tabela user_settings criada/verificada');
    console.log('✅ Configurações padrão inseridas para usuários existentes');
    console.log('\n🎉 Pronto! Recarregue a página de configurações.');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
}

runMigration();
