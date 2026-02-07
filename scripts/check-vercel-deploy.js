#!/usr/bin/env node

/**
 * Script de verificação pré-deploy
 * Verifica se todos os arquivos necessários existem antes do deploy no Vercel
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'package.json',
  'next.config.mjs',
  'vercel.json',
  '.vercelignore',
  'app/layout.tsx',
  'tsconfig.json'
];

const optionalFiles = [
  '.env.local',
  '.env.production.example',
  'DEPLOY_VERCEL.md'
];

console.log('🔍 Verificando arquivos necessários para deploy no Vercel...\n');

let hasErrors = false;
let warnings = 0;

// Verificar arquivos obrigatórios
console.log('📋 Arquivos OBRIGATÓRIOS:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - FALTANDO!`);
    hasErrors = true;
  }
});

// Verificar arquivos opcionais
console.log('\n📄 Arquivos OPCIONAIS:');
optionalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - Recomendado`);
    warnings++;
  }
});

// Verificar package.json
console.log('\n📦 Verificando package.json...');
try {
  const pkg = require(path.join(process.cwd(), 'package.json'));
  
  if (pkg.scripts && pkg.scripts.build) {
    console.log('  ✅ Script "build" encontrado');
  } else {
    console.log('  ❌ Script "build" não encontrado!');
    hasErrors = true;
  }
  
  if (pkg.dependencies && pkg.dependencies.next) {
    console.log(`  ✅ Next.js ${pkg.dependencies.next} instalado`);
  } else {
    console.log('  ❌ Next.js não encontrado nas dependências!');
    hasErrors = true;
  }
} catch (error) {
  console.log('  ❌ Erro ao ler package.json:', error.message);
  hasErrors = true;
}

// Verificar estrutura de pastas
console.log('\n📁 Verificando estrutura de pastas...');
const requiredDirs = ['app', 'components', 'lib'];
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(path.join(process.cwd(), dir));
  if (exists) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - FALTANDO!`);
    hasErrors = true;
  }
});

// Verificar .env.local
console.log('\n🔐 Verificando variáveis de ambiente...');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const requiredVars = [
    'DATABASE_URL',
    'POSTGRES_URL'
  ];
  
  const optionalVars = [
    'PLUGGY_CLIENT_ID',
    'UPSTASH_REDIS_REST_URL',
    'BLOB_READ_WRITE_TOKEN',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY'
  ];
  
  console.log('  Variáveis OBRIGATÓRIAS:');
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      console.log(`    ✅ ${varName}`);
    } else {
      console.log(`    ❌ ${varName} - Configure no Vercel!`);
    }
  });
  
  console.log('\n  Variáveis OPCIONAIS:');
  optionalVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      console.log(`    ✅ ${varName}`);
    } else {
      console.log(`    ⚠️  ${varName} - Configure se necessário`);
    }
  });
} else {
  console.log('  ⚠️  .env.local não encontrado');
  console.log('  ℹ️  Configure as variáveis diretamente no Vercel');
}

// Resumo final
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ ERROS ENCONTRADOS! Corrija antes de fazer deploy.');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`⚠️  ${warnings} avisos encontrados (opcional)`);
  console.log('✅ Pronto para deploy no Vercel!');
  console.log('\n📚 Leia DEPLOY_VERCEL.md para instruções detalhadas');
  process.exit(0);
} else {
  console.log('✅ Tudo pronto para deploy no Vercel!');
  console.log('\n📚 Leia DEPLOY_VERCEL.md para instruções detalhadas');
  console.log('\n🚀 Próximos passos:');
  console.log('   1. git add . && git commit -m "Ready for deployment"');
  console.log('   2. git push origin main');
  console.log('   3. Acesse vercel.com e conecte seu repositório');
  console.log('   4. Configure as variáveis de ambiente');
  console.log('   5. Deploy! 🎉');
  process.exit(0);
}
