# FinanceDash - Dashboard Financeiro Pessoal (Produção)

> **Sistema Real de Gestão Financeira com Open Finance**

## 🚀 Status

✅ **Pronto para Produção**
- ✅ Banco de dados real sem dados fake
- ✅ Autenticação completa com bcrypt
- ✅ Integração Open Finance (Pluggy)
- ✅ Middleware de proteção de rotas
- ✅ Validação Zod em todas as APIs
- ✅ Sistema de alertas e previsões

## 📋 Pré-requisitos

Antes de começar, você precisa:

1. **Conta Neon (PostgreSQL)**
   - Crie em: https://neon.tech
   - Tier gratuito disponível

2. **Conta Pluggy (Open Finance)**
   - Crie em: https://dashboard.pluggy.ai
   - Acesso sandbox gratuito
   - Para produção: solicite aprovação

3. **Node.js 18+**

## 🔧 Configuração Rápida

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no seu projeto:

```env
# Database (Neon)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Open Finance (Pluggy)
PLUGGY_CLIENT_ID=seu_client_id_aqui
PLUGGY_CLIENT_SECRET=seu_client_secret_aqui

# Environment
NODE_ENV=production
```

### 2. Setup do Banco de Dados

Execute o script de produção:

```bash
# Este script NÃO contém dados fake
# Apenas estrutura das tabelas
scripts/setup-production-database.sql
```

### 3. Primeiro Acesso

1. **Acesse**: `/auth/register`
2. **Crie sua conta**:
   - Nome completo
   - Email válido
   - Senha forte (min 8 caracteres, 1 maiúscula, 1 minúscula, 1 número)
3. **Onboarding**: Configure sua primeira conta
4. **Dashboard**: Comece a usar!

## 🏦 Open Finance

### Como Funciona

1. **Conectar Banco**:
   - Vá em "Open Finance"
   - Clique em "Conectar banco"
   - Siga o fluxo do Pluggy Connect

2. **Sincronização Automática**:
   - ✅ Contas bancárias
   - ✅ Saldos atualizados
   - ✅ Transações (últimos 90 dias)
   - ✅ Categorização automática

3. **Segurança**:
   - 🔒 Conexão criptografada
   - 🔒 Padrão Open Finance Brasil
   - 🔒 Você pode desconectar a qualquer momento

### Modo Sandbox (Desenvolvimento)

Para testar sem conectar bancos reais:

```env
NODE_ENV=development
```

Bancos de teste disponíveis:
- **Banco Fake 1, 2, 3**
- **Credenciais**: `user-ok` / `password-ok`

## 📱 Funcionalidades

### ✅ Autenticação
- [x] Registro de usuários
- [x] Login com email/senha
- [x] Hash de senhas (bcrypt)
- [x] Sessões seguras (30 dias)
- [x] Logout
- [x] Proteção de rotas

### 💰 Gestão Financeira
- [x] Múltiplas contas
- [x] Transações manuais
- [x] Categorias customizáveis
- [x] Orçamentos por categoria
- [x] Metas financeiras
- [x] Alertas inteligentes
- [x] Previsões com IA

### 📊 Análises
- [x] Gráficos de receitas vs despesas
- [x] Breakdown por categoria
- [x] Tendências mensais
- [x] Taxa de poupança
- [x] Insights automáticos

### 🔗 Open Finance
- [x] Conexão com bancos
- [x] Sincronização automática
- [x] Múltiplas instituições
- [x] Histórico de 90 dias
- [x] Status de conexões

## 🛠️ Estrutura do Projeto

```
/app
  /auth
    /login          # Página de login
    /register       # Página de registro
  /onboarding       # Setup inicial
  /open-finance
    /connect        # Conectar bancos
  /api
    /auth           # APIs de autenticação
    /open-finance   # APIs Open Finance
    /transactions   # CRUD transações
    /accounts       # CRUD contas

/lib
  auth-real.ts      # Sistema de autenticação
  open-finance.ts   # Integração Pluggy
  db.ts             # Queries PostgreSQL
  schemas.ts        # Validação Zod
  alerts.ts         # Sistema de alertas
  predictions.ts    # Previsões financeiras

/scripts
  setup-production-database.sql  # Schema sem dados fake

/docs
  PRODUCTION_SETUP.md           # Guia completo
  OPEN_FINANCE_INTEGRATION.md   # Guia Open Finance
  DATABASE_SCHEMA.md            # Documentação do banco
```

## 🔐 Segurança

### Senhas
- Hash com bcrypt (12 salt rounds)
- Requisitos mínimos forçados
- Validação em múltiplas camadas

### Sessões
- Tokens de 32 bytes (crypto)
- HTTP-only cookies
- Secure flag em produção
- Expiração de 30 dias
- Registro de IP e User Agent

### Dados
- Validação Zod em todas APIs
- Queries parametrizadas (SQL injection protection)
- CORS configurado
- HTTPS obrigatório em produção

## 📊 Monitoramento

### Logs
Todos os logs usam prefixo `[v0]`:

```typescript
console.log('[v0] User registered:', userId);
console.error('[v0] Open Finance error:', error);
```

### Queries Úteis

**Usuários ativos:**
```sql
SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days';
```

**Sessões ativas:**
```sql
SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW();
```

**Conexões Open Finance:**
```sql
SELECT status, COUNT(*) FROM open_finance_connections GROUP BY status;
```

**Última sincronização:**
```sql
SELECT institution_name, last_sync_at 
FROM open_finance_connections 
WHERE user_id = 'xxx' 
ORDER BY last_sync_at DESC;
```

## 🚨 Troubleshooting

### "Pluggy credentials not configured"
**Solução:** Configure `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`

### "Authentication required"
**Solução:**
1. Limpe cookies do navegador
2. Faça login novamente
3. Verifique se a sessão existe no banco

### "Failed to fetch accounts"
**Solução:**
1. Verifique credenciais do Pluggy
2. Confirme que o banco está ativo
3. Tente reconectar

### Transações não aparecem
**Solução:**
1. Verifique `last_sync_at` na tabela `open_finance_connections`
2. Force uma sincronização
3. Verifique logs de erro

## 📈 Performance

### Cache
- Sessões: 30 dias
- Connect tokens: 1 hora (Pluggy)

### Rate Limiting
Recomendado implementar para:
- Login: 5 tentativas / 15 min
- API calls: 100 req / min
- Open Finance: 10 conexões / hora

### Database Indexes
Já incluídos no script:
- user_id em todas as tabelas
- transaction_date
- session_token
- open_finance_id

## 🔄 Sincronização

### Automática
- Ao conectar um banco (90 dias)
- Ao acessar página Open Finance

### Manual (Recomendado)
Configure um cron job:

```typescript
// Exemplo: sync diário às 6h
import { syncItem } from '@/lib/open-finance';

await syncItem(itemId);
```

### Webhooks
Para sync em tempo real, configure webhooks do Pluggy:
- `item.updated`
- `item.error`
- `item.deleted`

## 📚 Recursos

### Documentação
- [Pluggy Docs](https://docs.pluggy.ai)
- [Neon Docs](https://neon.tech/docs)
- [Next.js 16](https://nextjs.org/docs)
- [Zod Validation](https://zod.dev)

### Suporte
- Pluggy: support@pluggy.ai
- Neon: support@neon.tech

## 📝 Licença

MIT License - Livre para uso comercial

---

## ⚡ Deploy Rápido

### Vercel (Recomendado)

1. **Conecte o repositório**
2. **Configure variáveis**:
   - `DATABASE_URL`
   - `PLUGGY_CLIENT_ID`
   - `PLUGGY_CLIENT_SECRET`
3. **Deploy!**

### Checklist Final

- [ ] Script de produção executado
- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS habilitado
- [ ] Primeira conta criada e testada
- [ ] Login funcionando
- [ ] Open Finance testado (sandbox)
- [ ] Logs configurados
- [ ] Backups do banco
- [ ] Política de privacidade
- [ ] Termos de uso

---

**🎉 Parabéns! Seu FinanceDash está pronto para produção!**

Para suporte, consulte `/docs/PRODUCTION_SETUP.md`
