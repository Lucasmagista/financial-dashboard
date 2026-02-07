#!/usr/bin/env node

/**
 * Script Automático de Setup do Banco de Dados
 * Configura o .env.local e cria todas as tabelas
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🗄️  Setup Automático do Banco de Dados FinanceDash\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('📋 Este script vai:');
  console.log('   1. Configurar sua DATABASE_URL no .env.local');
  console.log('   2. Criar todas as tabelas no banco de dados');
  console.log('   3. Verificar a conexão\n');

  // Verificar se .env.local existe
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env.local não encontrado!');
    console.log('   Criando baseado no .env.example...\n');
    
    const examplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Arquivo .env.local criado!\n');
    }
  }

  // Solicitar URL do banco
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 PASSO 1: Configure a URL do Banco de Dados');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Já criou sua conta no Neon.tech?');
  console.log('Se NÃO: Acesse https://neon.tech e crie um projeto\n');
  
  const databaseUrl = await question('Cole aqui a URL do banco (Connection String):\n> ');

  if (!databaseUrl || !databaseUrl.trim()) {
    console.log('\n❌ URL não fornecida. Execute o script novamente.\n');
    rl.close();
    process.exit(1);
  }

  const url = databaseUrl.trim();

  // Validar URL
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.log('\n❌ URL inválida! Deve começar com postgresql://\n');
    console.log('Exemplo válido:');
    console.log('postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require\n');
    rl.close();
    process.exit(1);
  }

  // Atualizar .env.local
  console.log('\n📝 Atualizando .env.local...');
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('DATABASE_URL=')) {
      lines[i] = `DATABASE_URL=${url}`;
      updated = true;
      break;
    }
  }

  if (!updated) {
    // Adicionar no final se não existir
    lines.push(`\n# Database Configuration`);
    lines.push(`DATABASE_URL=${url}`);
  }

  fs.writeFileSync(envPath, lines.join('\n'));
  console.log('✅ .env.local atualizado!\n');

  // Tentar conectar e criar tabelas
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔨 PASSO 2: Criar Tabelas no Banco de Dados');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const createTables = await question('Deseja criar as tabelas agora? (s/n): ');

  if (createTables.toLowerCase() === 's' || createTables.toLowerCase() === 'sim') {
    console.log('\n📦 Instalando driver PostgreSQL...');
    
    try {
      // Verificar se pg está instalado
      try {
        require('pg');
        console.log('✅ Driver já instalado!\n');
      } catch (err) {
        console.log('⏳ Instalando pg...');
        const { execSync } = require('child_process');
        execSync('npm install --no-save pg', { stdio: 'inherit' });
        console.log('✅ Driver instalado!\n');
      }

      const { Client } = require('pg');
      const client = new Client({ connectionString: url });

      console.log('🔌 Conectando ao banco de dados...');
      await client.connect();
      console.log('✅ Conectado!\n');

      console.log('📝 Criando tabelas...');
      const sqlPath = path.join(__dirname, 'setup-production-database.sql');
      
      if (!fs.existsSync(sqlPath)) {
        console.log('❌ Arquivo SQL não encontrado em:', sqlPath);
        console.log('\n⚠️  Execute manualmente:');
        console.log('   1. Acesse https://console.neon.tech');
        console.log('   2. SQL Editor');
        console.log('   3. Execute o conteúdo de: scripts/setup-production-database.sql\n');
      } else {
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
        
        console.log('📊 Tabelas criadas:');
        result.rows.forEach(row => {
          console.log(`   ✅ ${row.table_name}`);
        });
        console.log('');
      }

      await client.end();

    } catch (err) {
      console.log('❌ Erro ao criar tabelas:', err.message);
      console.log('\n⚠️  Crie as tabelas manualmente:');
      console.log('   1. Acesse: https://console.neon.tech');
      console.log('   2. Selecione seu projeto');
      console.log('   3. Clique em "SQL Editor"');
      console.log('   4. Abra: scripts/setup-production-database.sql');
      console.log('   5. Copie todo o conteúdo');
      console.log('   6. Cole no SQL Editor e execute\n');
    }
  } else {
    console.log('\n⚠️  Você precisará criar as tabelas manualmente:');
    console.log('   1. Acesse: https://console.neon.tech');
    console.log('   2. SQL Editor');
    console.log('   3. Execute: scripts/setup-production-database.sql\n');
  }

  // Verificação final
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ PASSO 3: Verificação Final');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ DATABASE_URL configurada');
  console.log('✅ .env.local atualizado\n');

  console.log('🚀 Próximos passos:');
  console.log('   1. Executar: pnpm check');
  console.log('   2. Executar: pnpm dev');
  console.log('   3. Acessar: http://localhost:3000\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✨ Setup concluído! Bom trabalho!\n');

  rl.close();
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  rl.close();
  process.exit(1);
});
