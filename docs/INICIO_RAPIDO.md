# 🚀 Guia de Início Rápido - FinanceDash

## ⚡ Configuração Inicial (5 minutos)

### 1️⃣ Instalar Dependências

```bash
pnpm install
```

Ou se preferir:

```bash
npm install
```

### 2️⃣ Configurar Banco de Dados

#### Criar Conta no Neon (PostgreSQL gratuito)

1. Acesse: https://neon.tech
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Copie a **Connection String**

#### Configurar Variáveis de Ambiente

Abra o arquivo `.env.local` e cole sua URL do banco:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 3️⃣ Criar Tabelas no Banco de Dados

Execute o script de setup:

```bash
# No PostgreSQL do Neon, execute o conteúdo do arquivo:
scripts/setup-production-database.sql
```

**Opção 1 - Via Neon Dashboard:**

- Acesse o dashboard do Neon
- Vá em "SQL Editor"
- Copie e cole o conteúdo do arquivo `scripts/setup-production-database.sql`
- Execute

**Opção 2 - Via linha de comando:**

```bash
# Usando psql (se tiver instalado)
psql "$DATABASE_URL" < scripts/setup-production-database.sql
```

### 4️⃣ Iniciar o Projeto

```bash
pnpm dev
```

Acesse: **http://localhost:3000**

---

## 🎯 Primeiros Passos

### 1. Criar sua Conta

- Acesse: `/auth/register`
- Preencha seus dados
- Crie uma senha forte

### 2. Fazer Login

- Acesse: `/auth/login`
- Entre com suas credenciais

### 3. Onboarding

- Configure sua primeira conta bancária
- Adicione suas categorias favoritas

### 4. Adicionar Transações

- Clique em "Nova Transação"
- Preencha os dados
- Veja o dashboard atualizar em tempo real!

---

## 📦 O que foi criado automaticamente

✅ `.env.example` - Modelo de variáveis de ambiente  
✅ `.env.local` - Arquivo de configuração local (você precisa editar!)  
✅ `tailwind.config.css` - Configuração do Tailwind CSS v4  
✅ `.eslintrc.json` - Regras de linting  
✅ `.prettierrc` - Formatação de código  
✅ `vercel.json` - Configuração para deploy

---

## 🔧 Variáveis de Ambiente Essenciais

### Obrigatórias (para começar)

- ✅ `DATABASE_URL` - URL do PostgreSQL (Neon)

### Opcionais (pode adicionar depois)

- `PLUGGY_CLIENT_ID` - Para integração Open Finance
- `PLUGGY_CLIENT_SECRET` - Para integração Open Finance
- `UPSTASH_REDIS_REST_URL` - Para cache (melhora performance)
- `UPSTASH_REDIS_REST_TOKEN` - Para cache
- `BLOB_READ_WRITE_TOKEN` - Para upload de recibos

---

## 🏦 Integração Open Finance (Opcional)

Se quiser conectar bancos reais:

1. **Criar conta Pluggy:**
   - Acesse: https://dashboard.pluggy.ai
   - Crie uma conta
   - Copie suas credenciais

2. **Adicionar no `.env.local`:**

   ```env
   PLUGGY_CLIENT_ID=seu_client_id_aqui
   PLUGGY_CLIENT_SECRET=seu_client_secret_aqui
   ```

3. **Testar:**
   - Acesse `/open-finance` no app
   - Clique em "Conectar Banco"
   - Use o modo sandbox para testar

---

## 🐛 Problemas Comuns

### Erro de Conexão com Banco

**Solução:** Verifique se:

- A `DATABASE_URL` está correta no `.env.local`
- O banco de dados do Neon está ativo
- As tabelas foram criadas (execute o script de setup)

### Porta 3000 já em uso

**Solução:**

```bash
# Use outra porta
pnpm dev -p 3001
```

### Erro ao instalar dependências

**Solução:**

```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 Próximos Passos

1. ✅ Configure o banco de dados
2. ✅ Crie sua conta
3. ✅ Adicione suas primeiras transações
4. 📊 Explore o dashboard de analytics
5. 🎯 Configure orçamentos e metas
6. 🏦 (Opcional) Conecte seus bancos via Open Finance

---

## 🆘 Precisa de Ajuda?

- 📖 Leia o [README.md](README.md) completo
- 📖 Veja [README_PRODUCTION.md](README_PRODUCTION.md) para detalhes de produção
- 📁 Confira a pasta `docs/` para mais documentação

---

## ✨ Recursos Principais

- 💰 **Dashboard Financeiro** - Visão completa das suas finanças
- 📊 **Analytics Avançado** - Gráficos e insights inteligentes
- 💳 **Gestão de Contas** - Múltiplas contas e saldos
- 📝 **Transações** - Histórico completo com filtros
- 🎯 **Orçamentos** - Controle de gastos por categoria
- 🏆 **Metas** - Objetivos financeiros
- 🏦 **Open Finance** - Conexão com bancos (opcional)

---

**Bom uso! 🎉**
