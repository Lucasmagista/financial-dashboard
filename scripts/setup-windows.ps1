# Script PowerShell para Configuração Inicial do FinanceDash
# Execute com: .\scripts\setup-windows.ps1

Write-Host "🚀 FinanceDash - Setup Automatizado para Windows" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "   Baixe em: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Verificar se pnpm está instalado
Write-Host ""
Write-Host "📦 Verificando PNPM..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ PNPM instalado: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PNPM não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "✅ PNPM instalado com sucesso!" -ForegroundColor Green
}

# Verificar arquivo .env.local
Write-Host ""
Write-Host "🔍 Verificando configuração..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✅ Arquivo .env.local existe" -ForegroundColor Green
    
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "DATABASE_URL=postgresql://.*@.*") {
        if ($envContent -notmatch "your-neon-host") {
            Write-Host "✅ DATABASE_URL configurada" -ForegroundColor Green
        } else {
            Write-Host "⚠️  DATABASE_URL precisa ser configurada!" -ForegroundColor Yellow
            Write-Host "   Edite o arquivo .env.local com sua URL do Neon" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  DATABASE_URL não configurada" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Arquivo .env.local não encontrado" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "   Criando .env.local baseado no .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env.local"
        Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
        Write-Host "   Configure a DATABASE_URL no arquivo .env.local" -ForegroundColor Yellow
    }
}

# Instalar dependências
Write-Host ""
Write-Host "📥 Instalando dependências..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "ℹ️  node_modules já existe. Pulando..." -ForegroundColor Cyan
} else {
    pnpm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
        exit 1
    }
}

# Resumo
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure o banco de dados Neon:" -ForegroundColor White
Write-Host "   - Acesse: https://neon.tech" -ForegroundColor Gray
Write-Host "   - Crie um projeto PostgreSQL" -ForegroundColor Gray
Write-Host "   - Copie a Connection String" -ForegroundColor Gray
Write-Host "   - Cole no arquivo .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Execute o script SQL:" -ForegroundColor White
Write-Host "   - Abra o Neon Dashboard > SQL Editor" -ForegroundColor Gray
Write-Host "   - Execute: scripts/setup-production-database.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Inicie o projeto:" -ForegroundColor White
Write-Host "   pnpm dev" -ForegroundColor Green
Write-Host ""
Write-Host "4. Acesse: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Leia WINDOWS_SETUP.md para mais detalhes" -ForegroundColor Yellow
Write-Host ""
