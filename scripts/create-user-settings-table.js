const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function createUserSettingsTable() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔄 Criando tabela user_settings...\n');
    
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT false,
        budget_alerts BOOLEAN DEFAULT true,
        transaction_alerts BOOLEAN DEFAULT true,
        theme VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'pt-br',
        currency VARCHAR(3) DEFAULT 'BRL',
        date_format VARCHAR(20) DEFAULT 'dd/mm/yyyy',
        week_start VARCHAR(10) DEFAULT 'sunday',
        session_timeout VARCHAR(10) DEFAULT '30',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;
    console.log('✅ Tabela user_settings criada');
    
    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
    `;
    console.log('✅ Índice criado');
    
    // Insert default settings for existing users
    await sql`
      INSERT INTO user_settings (user_id, created_at, updated_at)
      SELECT 
        u.id,
        NOW(),
        NOW()
      FROM users u
      LEFT JOIN user_settings us ON u.id = us.user_id
      WHERE us.id IS NULL
      ON CONFLICT (user_id) DO NOTHING
    `;
    console.log('✅ Configurações padrão inseridas para usuários existentes');
    
    // Verify
    const count = await sql`SELECT COUNT(*) as count FROM user_settings`;
    console.log(`\n✅ ${count[0].count} configuração(ões) criada(s)`);
    
    console.log('\n🎉 Migration concluída com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createUserSettingsTable();
