# 🪟 Guia de Instalação - Windows

## 📋 Pré-requisitos

### 1. Node.js

- Baixe e instale o Node.js 18+ em: https://nodejs.org
- Verifique a instalação:

```powershell
node --version
npm --version
```

### 2. PNPM (Gerenciador de Pacotes - Recomendado)

```powershell
npm install -g pnpm
```

Ou use NPM que já vem com o Node.js.

---

## ⚡ Instalação Rápida

### Passo 1: Abrir o Terminal

- Pressione `Win + X` e escolha "Windows PowerShell" ou "Terminal"
- Ou use o terminal integrado do VS Code (`Ctrl + '`)

### Passo 2: Navegar até a pasta do projeto

```powershell
cd "C:\Users\Lucas Magista\Downloads\financial-dashboard"
```

### Passo 3: Instalar dependências

```powershell
pnpm install
```

Ou com NPM:

```powershell
npm install
```

### Passo 4: Configurar Banco de Dados

#### 4.1. Criar conta no Neon (PostgreSQL gratuito)

1. Acesse: https://neon.tech
2. Clique em "Sign Up" (usar conta Google é mais rápido)
3. Crie um novo projeto PostgreSQL
4. Copie a **Connection String** (algo como: `postgresql://user:pass@host.neon.tech/db`)

#### 4.2. Configurar .env.local

Abra o arquivo `.env.local` com o Bloco de Notas ou VS Code:

```powershell
notepad .env.local
```

Substitua a linha:

```
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/your-database?sslmode=require
```

Por sua URL real do Neon:

```
DATABASE_URL=postgresql://seu_usuario:sua_senha@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Salve o arquivo (`Ctrl + S`) e feche.

### Passo 5: Criar Tabelas no Banco

#### Opção A: Via Neon Dashboard (Mais Fácil)

1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Abra o arquivo `scripts\setup-production-database.sql`
5. Copie todo o conteúdo (`Ctrl + A`, `Ctrl + C`)
6. Cole no SQL Editor do Neon (`Ctrl + V`)
7. Clique em "Run" para executar

#### Opção B: Via Terminal (se tiver psql instalado)

```powershell
# Definir variável com a URL do banco
$env:DATABASE_URL = "sua_url_aqui"

# Executar script
Get-Content scripts\setup-production-database.sql | psql $env:DATABASE_URL
```

### Passo 6: Verificar Configuração

```powershell
pnpm check
```

Este comando verifica se está tudo pronto!

### Passo 7: Iniciar o Projeto

```powershell
pnpm dev
```

Aguarde alguns segundos e acesse: **http://localhost:3000**

---

## 🎯 Primeiros Acessos

### 1. Criar Conta

- Acesse: http://localhost:3000/auth/register
- Preencha:
  - Nome completo
  - Email válido
  - Senha (mínimo 8 caracteres)

### 2. Fazer Login

- Acesse: http://localhost:3000/auth/login
- Entre com email e senha

### 3. Explorar

- Dashboard estará vazio inicialmente
- Clique em "Nova Transação" para adicionar movimentações
- Explore os menus: Analytics, Transações, etc.

---

## 🔧 Comandos Úteis

```powershell
# Verificar configuração
pnpm check

# Iniciar servidor de desenvolvimento
pnpm dev

# Compilar para produção
pnpm build

# Iniciar em produção
pnpm start

# Verificar erros de código
pnpm lint

# Formatar código
pnpm format
```

---

## 🐛 Problemas Comuns no Windows

### Erro: "pnpm não é reconhecido"

**Solução:**

```powershell
npm install -g pnpm
```

Feche e abra o terminal novamente.

### Erro: "Política de Execução"

**Solução:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro de Porta 3000 em uso

**Solução:**

```powershell
# Usar outra porta
pnpm dev -- -p 3001
```

### Erro: "Cannot find module"

**Solução:**

```powershell
# Limpar e reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
```

### Banco de dados não conecta

**Verifique:**

1. URL está correta no `.env.local`
2. Não tem espaços antes/depois da URL
3. Incluiu `?sslmode=require` no final
4. Executou o script SQL de criação de tabelas

---

## 📝 Dicas para Windows

### Usar VS Code

1. Baixe em: https://code.visualstudio.com
2. Abra a pasta do projeto: `Arquivo > Abrir Pasta`
3. Terminal integrado: `Ctrl + '`
4. Extensões recomendadas:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - GitLens

### Atalhos Úteis

- `Ctrl + C` - Parar servidor (no terminal)
- `Ctrl + '` - Abrir/fechar terminal no VS Code
- `F5` - Atualizar página no navegador

### Firewall Windows

Se o Windows perguntar sobre permitir Node.js na rede:

- ✅ Clique em "Permitir acesso"

---

## 🔐 Segurança

⚠️ **NUNCA compartilhe o arquivo `.env.local`**

- Contém credenciais sensíveis
- Não faça commit no Git
- Já está no `.gitignore`

---

## 🆘 Precisa de Ajuda?

1. Leia [INICIO_RAPIDO.md](INICIO_RAPIDO.md)
2. Leia [README.md](README.md)
3. Veja [README_PRODUCTION.md](README_PRODUCTION.md)
4. Documentação em `docs/`

---

**Sucesso! 🎉**

Se tudo estiver funcionando, você verá a tela de boas-vindas em http://localhost:3000
