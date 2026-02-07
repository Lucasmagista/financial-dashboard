# Guia de Configuração em Produção

Este guia explica como configurar o FinanceDash para produção com dados reais e integrações funcionais.

## 🎯 Pré-requisitos

- Conta no Neon (PostgreSQL)
- Conta no Pluggy (Open Finance)
- Node.js 18+ instalado
- Vercel CLI (opcional, para deploy)

## 📦 1. Configuração do Banco de Dados

### 1.1 Executar Script de Produção

Execute o script de produção que **NÃO contém dados fake**:

```bash
# No v0, execute o script:
# scripts/setup-production-database.sql
```

Este script cria:
- ✅ Tabela de usuários com autenticação real
- ✅ Tabela de sessões para login seguro
- ✅ Tabelas de contas, transações, categorias
- ✅ Tabelas de orçamentos e metas
- ✅ Tabela de conexões Open Finance
- ❌ SEM dados de demonstração

### 1.2 Verificar Conexão

Certifique-se de que a variável `DATABASE_URL` está configurada:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

## 🔐 2. Configuração do Open Finance (Pluggy)

### 2.1 Criar Conta no Pluggy

1. Acesse [https://dashboard.pluggy.ai](https://dashboard.pluggy.ai)
2. Crie uma conta gratuita
3. Acesse o Dashboard

### 2.2 Obter Credenciais

1. No dashboard do Pluggy, vá em **API Keys**
2. Copie:
   - **Client ID**
   - **Client Secret**

### 2.3 Configurar Variáveis de Ambiente

Adicione as variáveis no seu projeto:

```env
PLUGGY_CLIENT_ID=seu_client_id_aqui
PLUGGY_CLIENT_SECRET=seu_client_secret_aqui
```

### 2.4 Modo Sandbox (Desenvolvimento)

O Pluggy oferece um modo sandbox para testes:

- Instituições de teste disponíveis
- Dados fictícios mas estrutura real
- Ideal para desenvolvimento

### 2.5 Modo Produção

Para produção:

1. Complete o processo de verificação no Pluggy
2. Solicite acesso às instituições reais
3. Configure webhooks (opcional)

## 🔑 3. Autenticação

### 3.1 Hash de Senhas

O sistema usa **bcryptjs** para hash de senhas com salt de 12 rounds.

### 3.2 Sessões

- Sessões armazenadas no banco de dados
- Tokens seguros de 32 bytes
- Expiração de 30 dias
- Cookies HTTP-only e secure

### 3.3 Validação

Todas as entradas são validadas com **Zod**:
- Email válido
- Senha com requisitos mínimos
- Sanitização de dados

## 🚀 4. Primeiro Uso

### 4.1 Criar Primeira Conta

1. Acesse `/auth/register`
2. Preencha os dados:
   - Nome completo
   - Email
   - Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número)
3. Categorias padrão são criadas automaticamente

### 4.2 Fazer Login

1. Acesse `/auth/login`
2. Entre com email e senha
3. Você será redirecionado para o dashboard

### 4.3 Conectar Banco

1. No dashboard, vá em "Open Finance"
2. Clique em "Conectar banco"
3. Siga o fluxo do Pluggy Connect:
   - Escolha seu banco
   - Insira credenciais
   - Autorize acesso
4. Contas e transações são sincronizadas automaticamente

## 📊 5. Funcionalidades Disponíveis

### Sem Open Finance

Você pode usar o app normalmente sem conectar bancos:

✅ Adicionar contas manualmente
✅ Registrar transações
✅ Criar categorias personalizadas
✅ Definir orçamentos
✅ Estabelecer metas
✅ Ver gráficos e análises

### Com Open Finance

Recursos adicionais:

✅ Sincronização automática de transações
✅ Atualização de saldos em tempo real
✅ Múltiplas contas bancárias
✅ Histórico completo (90 dias)
✅ Categorização automática (Pluggy)

## 🔒 6. Segurança

### 6.1 Variáveis de Ambiente

**NUNCA** commite variáveis sensíveis:

```gitignore
.env
.env.local
.env.production
```

### 6.2 HTTPS

Em produção, sempre use HTTPS:
- Vercel fornece HTTPS automaticamente
- Cookies marcados como `secure`

### 6.3 Rate Limiting

Considere adicionar rate limiting para:
- Login attempts
- API calls
- Open Finance connections

### 6.4 Auditoria

Todas as sessões são registradas com:
- IP address
- User agent
- Timestamp

## 📈 7. Monitoramento

### 7.1 Logs

O sistema usa `console.log` com prefixo `[v0]`:

```typescript
console.log('[v0] User logged in:', userId);
console.error('[v0] Error connecting bank:', error);
```

### 7.2 Erros Open Finance

Conexões com erro são marcadas na tabela:

```sql
SELECT * FROM open_finance_connections WHERE status = 'error';
```

### 7.3 Sessões Ativas

Monitorar sessões:

```sql
SELECT COUNT(*) as active_sessions 
FROM user_sessions 
WHERE expires_at > NOW();
```

## 🔄 8. Sincronização

### 8.1 Automática

O Open Finance sincroniza automaticamente:
- Ao conectar um banco (90 dias de histórico)
- Quando você acessa a página Open Finance

### 8.2 Manual

Implemente um cron job para sync periódico:

```typescript
// Exemplo: sync diário
await syncItem(itemId);
```

### 8.3 Webhooks

Configure webhooks do Pluggy para:
- Novas transações
- Alterações de saldo
- Erros de conexão

## 🧪 9. Testes

### 9.1 Ambiente de Teste

Use o modo sandbox do Pluggy:

```env
NODE_ENV=development
```

### 9.2 Bancos de Teste

O Pluggy oferece instituições fake para testes:
- Banco Fake 1
- Banco Fake 2
- Credenciais: user-ok / password-ok

## 🚨 10. Troubleshooting

### Erro: "Pluggy credentials not configured"

**Solução:** Configure `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`

### Erro: "Authentication required"

**Solução:** 
1. Limpe cookies
2. Faça login novamente
3. Verifique sessões no banco

### Erro: "Failed to fetch accounts"

**Solução:**
1. Verifique credenciais Pluggy
2. Confirme que a instituição está ativa
3. Tente reconectar o banco

### Transações não aparecem

**Solução:**
1. Verifique `last_sync_at` na tabela de conexões
2. Force uma sincronização manual
3. Verifique logs de erro

## 📚 11. Recursos Adicionais

### Documentação Pluggy
- [API Reference](https://docs.pluggy.ai)
- [Connect Widget](https://docs.pluggy.ai/docs/pluggy-connect)
- [Webhooks](https://docs.pluggy.ai/docs/webhooks)

### Suporte
- Pluggy: support@pluggy.ai
- Neon: support@neon.tech

## ✅ Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Script de produção executado
- [ ] Credenciais Pluggy configuradas
- [ ] Variáveis de ambiente definidas
- [ ] HTTPS habilitado
- [ ] Primeira conta de usuário criada
- [ ] Teste de login funcionando
- [ ] Conexão Open Finance testada
- [ ] Logs configurados
- [ ] Backups do banco configurados
- [ ] Política de privacidade criada
- [ ] Termos de uso criados

---

**Pronto!** Seu FinanceDash está configurado para produção com dados reais e Open Finance funcional.
