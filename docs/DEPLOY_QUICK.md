# ⚡ Quick Deploy - Vercel

## 🚀 Deploy Rápido (5 minutos)

### 1. Verificar se está tudo pronto

```bash
pnpm check-deploy
```

### 2. Fazer commit e push

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 3. Deploy no Vercel

#### Via Web (Recomendado)

1. Acesse: https://vercel.com/new
2. Conecte seu repositório GitHub
3. Configure variáveis de ambiente (veja abaixo)
4. Deploy!

#### Via CLI

```bash
pnpm add -g vercel
vercel login
vercel --prod
```

---

## 🔐 Variáveis de Ambiente no Vercel

### ⚠️ OBRIGATÓRIAS

Copie e cole no Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_URL=postgresql://neondb_owner:npg_Zz70IpqcEFLt@ep-restless-queen-ah7lh8mt-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

POSTGRES_URL=postgresql://neondb_owner:npg_Zz70IpqcEFLt@ep-restless-queen-ah7lh8mt-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

NODE_ENV=production
```

### ✅ OPCIONAIS (mas recomendadas)

**Open Finance:**

```env
PLUGGY_CLIENT_ID=242c40e0-94e4-47c6-b65d-8f9c7f157b59
PLUGGY_CLIENT_SECRET=fcb22bd5-3661-49d5-b551-57f5446b005c
```

**Cache Redis:**

```env
UPSTASH_REDIS_REST_URL=https://enabling-ghoul-48812.upstash.io
UPSTASH_REDIS_REST_TOKEN=Ab6sAAIncDE5ODQ2YmU2ZDQ2YjM0MGQ1OWRjYWVkNzliYmI4ODM1NnAxNDg4MTI
```

**Push Notifications:**

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDMS2KccSCUQCUZp5ZtGczA918lWm2j6-ZnQFOwtRRb_NN-LasZdLMT1KAeX2GrR63aGFnt76jy-Z7s-uKvTo20
```

> ⚠️ **IMPORTANTE:** Para cada variável no Vercel, selecione todos os ambientes:
>
> - ✅ Production
> - ✅ Preview
> - ✅ Development

---

## 🔧 Solução Rápida de Problemas

### ❌ "Environment Variable DATABASE_URL references Secret"

**Solução:** Cole o valor completo da URL, **não** use `@database_url`

### ❌ "Failed to connect to database"

**Solução:** Verifique se a URL tem `?sslmode=require` no final

### ❌ "Module not found"

**Solução:**

```bash
rm -rf .next node_modules
pnpm install
```

### ❌ Página em branco após deploy

**Solução:** Verifique os logs no Vercel Dashboard → Function Logs

---

## ✅ Checklist Pós-Deploy

- [ ] Site acessível em `seu-projeto.vercel.app`
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Transações sendo salvas

---

## 📚 Guia Completo

Para instruções detalhadas, leia: [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md)

---

## 🆘 Precisa de Ajuda?

- **Logs:** `vercel logs --follow`
- **Documentação:** https://vercel.com/docs
- **Status do Vercel:** https://vercel-status.com

---

**Última atualização:** Fevereiro 2026
