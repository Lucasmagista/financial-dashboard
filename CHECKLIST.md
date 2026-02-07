# ✅ Checklist de Instalação - FinanceDash

Use este checklist para garantir que tudo está configurado corretamente!

---

## 📋 Pré-requisitos

- [ ] Node.js 18+ instalado
  - Teste: `node --version`
  - Download: https://nodejs.org

- [ ] PNPM instalado (ou NPM)
  - Teste: `pnpm --version`
  - Instalar: `npm install -g pnpm`

---

## 🔧 Configuração Inicial

### 1. Dependências

- [ ] Naveguei até a pasta do projeto
- [ ] Executei `pnpm install` (ou `npm install`)
- [ ] Aguardei a instalação completar (pode demorar 1-3 minutos)
- [ ] Pasta `node_modules` foi criada

### 2. Banco de Dados Neon

- [ ] Criei conta em https://neon.tech
- [ ] Criei um novo projeto PostgreSQL
- [ ] Copiei a **Connection String** completa
- [ ] Anotei a URL em lugar seguro

**Exemplo de URL válida:**

```
postgresql://username:password@ep-cool-pond-123.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 3. Arquivo .env.local

- [ ] Abri o arquivo `.env.local`
- [ ] Encontrei a linha `DATABASE_URL=...`
- [ ] Substituí pela minha URL do Neon
- [ ] Salvei o arquivo
- [ ] Fechei o editor

**Antes:**

```env
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/your-database?sslmode=require
```

**Depois (com minha URL):**

```env
DATABASE_URL=postgresql://myuser:mypass@ep-cool-pond-123.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 4. Criar Tabelas no Banco

**Opção A - Via Neon Dashboard (Recomendado):**

- [ ] Acessei https://console.neon.tech
- [ ] Selecionei meu projeto
- [ ] Cliquei em "SQL Editor" no menu lateral
- [ ] Abri o arquivo `scripts/setup-production-database.sql` no meu computador
- [ ] Copiei TODO o conteúdo (Ctrl+A, Ctrl+C)
- [ ] Colei no SQL Editor do Neon (Ctrl+V)
- [ ] Cliquei em "Run" ou "Execute"
- [ ] Vi mensagens de sucesso (tabelas criadas)

**Opção B - Via Terminal (Avançado):**

- [ ] Instalei PostgreSQL Client (psql)
- [ ] Executei: `psql "minha_url" < scripts/setup-production-database.sql`
- [ ] Vi mensagens de sucesso

---

## ✅ Verificação

### Executar Script de Verificação

```bash
pnpm check
```

**Resultado esperado:**

```
✅ package.json existe
✅ Dependências instaladas (node_modules)
✅ Arquivo .env.local existe
✅ DATABASE_URL configurada
```

Se todos os itens estiverem com ✅, prossiga!

---

## 🚀 Iniciar Projeto

### Primeiro Start

- [ ] Executei `pnpm dev` no terminal
- [ ] Aguardei a mensagem "Ready in Xs"
- [ ] Vi a mensagem com a URL local
- [ ] Abri o navegador em `http://localhost:3000`
- [ ] Vi a página de boas-vindas/login

**Mensagem esperada no terminal:**

```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
- ready in 2.3s
```

---

## 🎯 Primeiros Passos no App

### Criar Conta

- [ ] Acessei `/auth/register`
- [ ] Preenchi meus dados:
  - Nome completo
  - Email válido
  - Senha forte (min. 8 caracteres)
- [ ] Cliquei em "Criar Conta"
- [ ] Vi mensagem de sucesso

### Fazer Login

- [ ] Acessei `/auth/login`
- [ ] Digitei email e senha
- [ ] Cliquei em "Entrar"
- [ ] Fui redirecionado para o dashboard

### Explorar Dashboard

- [ ] Vi o dashboard principal (pode estar vazio)
- [ ] Naveguei pelos menus:
  - Dashboard
  - Transações
  - Analytics
  - Contas
- [ ] Testei adicionar uma transação
- [ ] Vi a transação aparecer no dashboard

---

## 🏦 Open Finance (Opcional)

**Só faça isso se quiser conectar bancos reais:**

### Criar Conta Pluggy

- [ ] Acessei https://dashboard.pluggy.ai
- [ ] Criei uma conta
- [ ] Copiei `Client ID`
- [ ] Copiei `Client Secret`

### Configurar .env.local

- [ ] Abri `.env.local`
- [ ] Adicionei:
  ```env
  PLUGGY_CLIENT_ID=meu_client_id
  PLUGGY_CLIENT_SECRET=meu_client_secret
  ```
- [ ] Salvei o arquivo
- [ ] Reiniciei o servidor (Ctrl+C e `pnpm dev` novamente)

### Testar Conexão

- [ ] Acessei `/open-finance` no app
- [ ] Cliquei em "Conectar Banco"
- [ ] Testei com banco sandbox
- [ ] Vi contas sendo sincronizadas

---

## 🐛 Solução de Problemas

### Se algo não funcionar:

**1. Verificar configuração:**

```bash
pnpm check
```

**2. Ver erros no terminal:**

- Leia as mensagens de erro
- Verifique se tem algum `❌`

**3. Limpar e reinstalar:**

```bash
# Apagar node_modules
rm -rf node_modules
# Ou no Windows PowerShell:
# Remove-Item -Recurse -Force node_modules

# Reinstalar
pnpm install
```

**4. Verificar .env.local:**

- URL do banco está correta?
- Não tem espaços extras?
- Tem `?sslmode=require` no final?

**5. Verificar porta:**

```bash
# Usar porta diferente
pnpm dev -- -p 3001
```

---

## 📊 Status Final

Marque todos os itens que você completou:

### Essenciais

- [ ] ✅ Node.js instalado
- [ ] ✅ Dependências instaladas (`node_modules`)
- [ ] ✅ Banco de dados Neon criado
- [ ] ✅ `.env.local` configurado
- [ ] ✅ Tabelas criadas no banco
- [ ] ✅ Projeto iniciado com `pnpm dev`
- [ ] ✅ Acesso ao localhost:3000 funcionando
- [ ] ✅ Conta criada no app
- [ ] ✅ Login funcionando

### Opcionais

- [ ] Open Finance configurado
- [ ] Bancos conectados
- [ ] VS Code instalado
- [ ] Extensões instaladas

---

## 🎉 Sucesso!

Se você marcou todos os itens essenciais, **parabéns!**

Seu FinanceDash está pronto para uso! 🚀

### Próximos passos:

1. Adicionar suas contas bancárias
2. Registrar transações
3. Configurar orçamentos
4. Definir metas financeiras
5. Explorar analytics

---

## 📚 Recursos Adicionais

- [START_HERE.md](START_HERE.md) - Início rápido
- [INICIO_RAPIDO.md](INICIO_RAPIDO.md) - Guia completo
- [WINDOWS_SETUP.md](WINDOWS_SETUP.md) - Guia Windows
- [README.md](README.md) - Documentação completa
- [README_PRODUCTION.md](README_PRODUCTION.md) - Deploy produção

---

**Data de conclusão:** **_/_**/**\_\_**

**Tempo levado:** **\_** minutos

**Dificuldades encontradas:**

---

---

---
