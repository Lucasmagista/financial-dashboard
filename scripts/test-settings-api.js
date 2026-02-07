const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function testSettingsAPI() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🔍 Testando conexão com banco...\n');
    
    // Test 1: Check if table exists
    console.log('1️⃣ Verificando se tabela user_settings existe...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_settings'
      )
    `;
    console.log('✅ Tabela existe:', tableCheck[0].exists);
    
    if (!tableCheck[0].exists) {
      console.log('❌ Tabela user_settings não existe! Execute a migration primeiro.');
      process.exit(1);
    }
    
    // Test 2: Check table structure
    console.log('\n2️⃣ Verificando estrutura da tabela...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings'
      ORDER BY ordinal_position
    `;
    console.log('Colunas:', columns.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    
    // Test 3: Check if users exist
    console.log('\n3️⃣ Verificando usuários...');
    const users = await sql`SELECT id, name, email FROM users LIMIT 5`;
    console.log(`✅ ${users.length} usuário(s) encontrado(s)`);
    if (users.length > 0) {
      console.log('Primeiro usuário:', users[0]);
    }
    
    // Test 4: Check settings
    console.log('\n4️⃣ Verificando configurações...');
    const settings = await sql`SELECT * FROM user_settings LIMIT 5`;
    console.log(`✅ ${settings.length} configuração(ões) encontrada(s)`);
    if (settings.length > 0) {
      console.log('Primeira configuração:', settings[0]);
    }
    
    // Test 5: Try to fetch settings for first user
    if (users.length > 0) {
      console.log('\n5️⃣ Buscando configurações do primeiro usuário...');
      const userId = users[0].id;
      const userSettings = await sql`
        SELECT 
          email_notifications,
          push_notifications,
          budget_alerts,
          transaction_alerts,
          theme,
          language,
          currency,
          date_format,
          week_start,
          session_timeout
        FROM user_settings 
        WHERE user_id = ${userId}
      `;
      
      if (userSettings.length > 0) {
        console.log('✅ Configurações encontradas:', userSettings[0]);
      } else {
        console.log('⚠️ Nenhuma configuração encontrada para este usuário');
        console.log('Criando configurações padrão...');
        await sql`
          INSERT INTO user_settings (user_id)
          VALUES (${userId})
          ON CONFLICT (user_id) DO NOTHING
        `;
        console.log('✅ Configurações criadas');
      }
    }
    
    console.log('\n✅ Todos os testes passaram!');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSettingsAPI();
