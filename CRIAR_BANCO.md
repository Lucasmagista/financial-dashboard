# 🗄️ CRIAR BANCO DE DADOS - Passo a Passo

## ⚡ Processo Rápido (2 minutos)

### Passo 1: Criar Conta no Neon (1 minuto)

1. **Acesse:** https://neon.tech
2. **Clique em:** "Sign Up" (canto superior direito)
3. **Escolha:** Login com Google (mais rápido) OU Email

### Passo 2: Criar Projeto PostgreSQL (30 segundos)

Após fazer login:

1. **Clique em:** "Create a project" ou "New Project"
2. **Nome do projeto:** FinanceDash (ou qualquer nome)
3. **Região:** Selecione "AWS / South America (São Paulo)" se disponível
4. **Clique em:** "Create Project"

### Passo 3: Copiar Connection String (10 segundos)

Você verá uma tela com:

- ✅ "Project created successfully"
- 📋 Connection String

**COPIE** a string completa que começa com `postgresql://`

Exemplo:

```
postgresql://neondb_owner:npg_xxx@ep-cool-pond-123.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Passo 4: Configurar no Projeto (AUTOMÁTICO)

1. **Cole a URL que você copiou aqui embaixo** e pressione Enter no terminal:

```powershell
# Execute este comando e cole sua URL quando solicitado
node scripts/setup-database-auto.js
```

**OU manualmente:**

1. Abra o arquivo `.env.local`
2. Encontre a linha: `DATABASE_URL=...`
3. Cole sua URL do Neon
4. Salve (Ctrl+S)

### Passo 5: Criar Tabelas Automaticamente

```powershell
# Este script conecta e cria todas as tabelas
node scripts/setup-database-auto.js
```

---

## 🎯 Resumo Ultra-Rápido

```
1. https://neon.tech → Sign Up
2. Create Project → FinanceDash
3. Copiar URL (postgresql://...)
4. node scripts/setup-database-auto.js
5. Colar a URL quando solicitado
6. Aguardar criação das tabelas
7. pnpm dev
```

---

## 📋 Informações do Banco

**Nome sugerido:** FinanceDash  
**Região:** South America (São Paulo) - se disponível  
**Tipo:** PostgreSQL (padrão do Neon)

**Nota:** A senha é gerenciada automaticamente pelo Neon e vem na Connection String.

---

## 🔍 Verificar se Funcionou

```powershell
pnpm check
```

Deve mostrar:

```
✅ DATABASE_URL configurada
```

---

## 🆘 Problemas?

### "Não encontrei a Connection String"

- Após criar o projeto, procure por "Connection String" ou "Connection Details"
- Clique em "Show password" se necessário
- Copie a string completa

### "Erro ao conectar"

- Verifique se copiou a URL completa
- Deve terminar com `?sslmode=require`
- Não pode ter espaços antes/depois

### "Script não encontrado"

```powershell
# Esteja na pasta correta
cd "C:\Users\Lucas Magista\Downloads\financial-dashboard"
```

---

**Vamos lá! Crie sua conta no Neon agora! 🚀**
