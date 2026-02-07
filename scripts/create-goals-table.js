const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function createGoalsTable() {
  try {
    console.log('🔄 Criando tabela goals...');
    
    // Verificar se a tabela existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'goals'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ Tabela goals já existe');
      return;
    }
    
    // Criar tabela
    await sql`
      CREATE TABLE goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0,
        target_date DATE,
        category VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('✅ Tabela goals criada');
    
    // Criar índice
    await sql`CREATE INDEX idx_goals_user_id ON goals(user_id);`;
    console.log('✅ Índice criado');
    
    // Criar função de update
    await sql`
      CREATE OR REPLACE FUNCTION update_goals_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Criar trigger
    await sql`
      CREATE TRIGGER goals_updated_at_trigger
        BEFORE UPDATE ON goals
        FOR EACH ROW
        EXECUTE FUNCTION update_goals_updated_at();
    `;
    
    console.log('✅ Trigger criado');
    console.log('🎉 Tabela goals configurada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela goals:', error);
    throw error;
  }
}

createGoalsTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
