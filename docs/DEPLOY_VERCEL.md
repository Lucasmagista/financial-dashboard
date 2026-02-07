# 🚀 Guia Completo de Deploy no Vercel

Este guia vai te ajudar a fazer o deploy do seu Financial Dashboard no Vercel em poucos minutos.

---

## 📋 Pré-requisitos

Antes de começar, você precisa:

- ✅ Conta no [Vercel](https://vercel.com)
- ✅ Banco de dados PostgreSQL (recomendado: [Neon.tech](https://neon.tech))
- ✅ Projeto no GitHub/GitLab/Bitbucket (opcional, mas recomendado)

---

## 🎯 Passo 1: Preparar o Projeto

### 1.1 Verificar arquivos necessários

Certifique-se de que estes arquivos existem:

- ✅ `package.json`
- ✅ `next.config.mjs`
- ✅ `vercel.json`
- ✅ `.vercelignore`

### 1.2 Fazer commit das mudanças

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## 🌐 Passo 2: Deploy no Vercel

### Opção A: Deploy via GitHub (Recomendado)

1. **Acesse** [vercel.com/new](https://vercel.com/new)
2. **Conecte** seu repositório GitHub
3. **Selecione** o projeto `financial-dashboard`
4. **Configure** as variáveis de ambiente (veja Passo 3)
5. **Clique** em "Deploy"

### Opção B: Deploy via CLI

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

No dashboard do Vercel, vá em **Settings** → **Environment Variables** e adicione:

### 3.1 Variáveis OBRIGATÓRIAS

| Variável       | Valor                                            | Onde conseguir                                     |
| -------------- | ------------------------------------------------ | -------------------------------------------------- |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | [Neon.tech](https://neon.tech) → Connection String |
| `POSTGRES_URL` | _(mesmo valor de DATABASE_URL)_                  | Mesmo valor acima                                  |
| `NODE_ENV`     | `production`                                     | Digite manualmente                                 |

### 3.2 Variáveis OPCIONAIS (mas recomendadas)

#### Open Finance / Pluggy

| Variável               | Onde conseguir                                  |
| ---------------------- | ----------------------------------------------- |
| `PLUGGY_CLIENT_ID`     | [Pluggy Dashboard](https://dashboard.pluggy.ai) |
| `PLUGGY_CLIENT_SECRET` | [Pluggy Dashboard](https://dashboard.pluggy.ai) |

#### Cache (Upstash Redis)

| Variável                   | Onde conseguir                                 |
| -------------------------- | ---------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | [Upstash Console](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | [Upstash Console](https://console.upstash.com) |

#### Notificações Push

| Variável                       | Como gerar                           |
| ------------------------------ | ------------------------------------ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys`   |
| `VAPID_PRIVATE_KEY`            | _(gerado junto com a chave pública)_ |

#### Blob Storage (Upload de recibos)

| Variável                | Onde conseguir         |
| ----------------------- | ---------------------- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Settings → Blob |

#### Monitoramento (Sentry)

| Variável                 | Onde conseguir                                    |
| ------------------------ | ------------------------------------------------- |
| `SENTRY_DSN`             | [Sentry.io](https://sentry.io) → Project Settings |
| `NEXT_PUBLIC_SENTRY_DSN` | _(mesmo valor)_                                   |

### 3.3 Como adicionar no Vercel

Para cada variável:

1. Clique em **Add New** → **Environment Variable**
2. Digite o **nome** da variável
3. Cole o **valor**
4. Selecione os ambientes: ✅ Production ✅ Preview ✅ Development
5. Clique em **Save**

---

## 🗄️ Passo 4: Configurar Banco de Dados

### 4.1 Criar banco no Neon.tech

1. Acesse [neon.tech](https://neon.tech) e faça login
2. Clique em **New Project**
3. Escolha:
   - **Name:** `financial-dashboard`
   - **Region:** `US East (Ohio)` ou mais próximo
4. Copie a **Connection String**

### 4.2 Executar migrations

Após o deploy, execute no terminal local:

```bash
# Defina a DATABASE_URL do Neon
export DATABASE_URL="sua_connection_string_aqui"

# Execute as migrations
pnpm db:migrate

# Ou se não tiver o script, use SQL direto
```

**Ou** use o Neon SQL Editor no dashboard para executar o schema manualmente.

---

## ✅ Passo 5: Verificar Deploy

### 5.1 Checklist pós-deploy

- [ ] Deploy concluído sem erros
- [ ] Site acessível via URL do Vercel
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Transações podendo ser criadas
- [ ] Banco de dados conectado

### 5.2 Testar funcionalidades

1. **Acesse** `https://seu-projeto.vercel.app`
2. **Faça login** ou crie uma conta
3. **Adicione** uma transação teste
4. **Verifique** se os dados são salvos

---

## 🔧 Solução de Problemas Comuns

### ❌ Erro: "Environment Variable DATABASE_URL references Secret database_url"

**Solução:** Não use `@secrets` no Vercel. Adicione o valor direto da URL.

1. Vá em **Settings** → **Environment Variables**
2. Delete a variável `DATABASE_URL`
3. Adicione novamente com o valor completo (não `@database_url`)

### ❌ Erro: "Failed to connect to database"

**Soluções:**

1. Verifique se `DATABASE_URL` tem `?sslmode=require`
2. Teste a conexão no Neon SQL Editor
3. Verifique se o IP da Vercel não está bloqueado

### ❌ Erro: "Module not found"

**Solução:**

```bash
# Limpe cache e reinstale
rm -rf .next node_modules
pnpm install
vercel --prod
```

### ❌ Página 404 ou 500

**Soluções:**

1. Verifique logs: Vercel Dashboard → Project → Deployments → [Latest] → View Function Logs
2. Verifique se todas as variáveis de ambiente estão configuradas
3. Verifique se o build foi concluído com sucesso

---

## 🎨 Passo 6: Customizar Domínio (Opcional)

### 6.1 Adicionar domínio customizado

1. Vá em **Settings** → **Domains**
2. Clique em **Add**
3. Digite seu domínio (`app.seudominio.com`)
4. Configure DNS conforme instruções

### 6.2 Configurar DNS

No seu provedor de domínio, adicione:

```
Type: CNAME
Name: app (ou @)
Value: cname.vercel-dns.com
```

---

## 📊 Monitoramento e Analytics

### Vercel Analytics

Já incluído automaticamente! Veja em: **Analytics** tab no dashboard.

### Sentry (Erros)

Se configurou `SENTRY_DSN`, veja erros em [sentry.io](https://sentry.io)

### Logs

Acesse logs em tempo real:

```bash
vercel logs --follow
```

---

## 🔄 Atualizações Futuras

### Deploy automático

Quando você fizer push para `main`, o Vercel faz deploy automaticamente!

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

### Deploy manual

```bash
vercel --prod
```

### Rollback

Se algo der errado:

1. Vá em **Deployments**
2. Selecione um deploy anterior
3. Clique em **Promote to Production**

---

## 📝 Checklist Final

Antes de divulgar seu app:

- [ ] ✅ Deploy funcionando
- [ ] ✅ Todas variáveis de ambiente configuradas
- [ ] ✅ Banco de dados com schema atualizado
- [ ] ✅ Login/cadastro funcionando
- [ ] ✅ Domínio customizado configurado (opcional)
- [ ] ✅ Analytics ativado
- [ ] ✅ Sentry configurado para monitorar erros
- [ ] ✅ Testado em mobile
- [ ] ✅ SSL/HTTPS ativo (automático no Vercel)

---

## 🆘 Suporte

- **Documentação Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Documentação Next.js:** [nextjs.org/docs](https://nextjs.org/docs)
- **Comunidade:** [github.com/vercel/next.js/discussions](https://github.com/vercel/next.js/discussions)

---

## 🎉 Parabéns!

Seu Financial Dashboard está no ar! 🚀

Compartilhe com seus usuários: `https://seu-projeto.vercel.app`
