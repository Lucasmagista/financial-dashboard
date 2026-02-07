#!/usr/bin/env node

/**
 * Script de Verificação do Ambiente
 * Verifica se todas as configurações necessárias estão prontas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração do projeto FinanceDash...\n');

const checks = {
  envFile: false,
  databaseUrl: false,
  nodeModules: false,
  packageJson: false,
};

// 1. Verificar .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    checks.envFile = true;
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('DATABASE_URL=postgresql://') && 
        !envContent.includes('your-neon-host')) {
      checks.databaseUrl = true;
    }
  }
} catch (err) {
  console.error('Erro ao verificar .env.local:', err.message);
}

// 2. Verificar node_modules
try {
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  checks.nodeModules = fs.existsSync(nodeModulesPath);
} catch (err) {
  console.error('Erro ao verificar node_modules:', err.message);
}

// 3. Verificar package.json
try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  checks.packageJson = fs.existsSync(packagePath);
} catch (err) {
  console.error('Erro ao verificar package.json:', err.message);
}

// Exibir resultados
console.log('📋 Status da Configuração:\n');

console.log(checks.packageJson ? '✅' : '❌', 'package.json existe');
console.log(checks.nodeModules ? '✅' : '❌', 'Dependências instaladas (node_modules)');
console.log(checks.envFile ? '✅' : '❌', 'Arquivo .env.local existe');
console.log(checks.databaseUrl ? '✅' : '❌', 'DATABASE_URL configurada');

console.log('\n');

// Instruções baseadas nos checks
if (!checks.nodeModules) {
  console.log('⚠️  Execute: pnpm install (ou npm install)');
}

if (!checks.envFile) {
  console.log('⚠️  Crie o arquivo .env.local baseado no .env.example');
}

if (!checks.databaseUrl) {
  console.log('⚠️  Configure DATABASE_URL no .env.local');
  console.log('   1. Crie uma conta em https://neon.tech');
  console.log('   2. Crie um projeto PostgreSQL');
  console.log('   3. Copie a connection string');
  console.log('   4. Cole no .env.local');
}

if (checks.nodeModules && checks.databaseUrl) {
  console.log('✨ Configuração completa! Execute: pnpm dev\n');
} else {
  console.log('📖 Leia o arquivo INICIO_RAPIDO.md para mais detalhes\n');
}

// Status final
const allGood = Object.values(checks).every(check => check);
process.exit(allGood ? 0 : 1);
