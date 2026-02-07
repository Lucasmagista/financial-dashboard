# Configurações Melhoradas - FinanceDash

## 🎯 Novas Funcionalidades Implementadas

### 1. **Configurações Reais (Não Mockadas)**

- ✅ Todas as configurações são salvas no banco de dados
- ✅ Persistência entre sessões
- ✅ API completa para GET/PATCH de configurações

### 2. **Estatísticas da Conta**

- 📊 **Patrimônio Líquido**: Total de ativos menos passivos
- 💰 **Receitas e Despesas Totais**: Somadas de todas as transações
- 📈 **Economia Líquida**: Diferença entre receitas e despesas
- 🎯 **Progresso de Metas**: Quantas metas foram concluídas
- 📋 **Orçamentos Ativos**: Quantos orçamentos estão em vigor
- 📅 **Média Diária de Gastos**: Gasto médio por dia desde o início

### 3. **Mudança de Senha**

- 🔐 Alteração segura de senha com validação
- ✅ Verificação da senha atual
- ✅ Confirmação da nova senha
- ✅ Hash seguro com bcrypt

### 4. **Exportação de Dados Aprimorada**

- 📄 **JSON**: Exportação completa com todas as informações
  - Inclui resumo estatístico
  - Dados de contas, transações, categorias, orçamentos e metas
  - Configurações do usuário
  - Metadados (data de exportação, versão)
- 📊 **CSV**: Exportação organizada em seções
  - Seção de Transações (com categorias e contas)
  - Seção de Contas (com saldos e bancos)
  - Seção de Orçamentos (com progresso)
  - Seção de Metas (com percentual de conclusão)

### 5. **Preferências Salvas no Banco**

- ✅ Tema (claro/escuro/sistema)
- ✅ Idioma (pt-br/en/es)
- ✅ Moeda principal (BRL/USD/EUR)
- ✅ Formato de data
- ✅ Início da semana
- ✅ Notificações por email
- ✅ Notificações push
- ✅ Alertas de orçamento
- ✅ Alertas de transações
- ✅ Timeout de sessão

## 📋 APIs Criadas/Atualizadas

### GET `/api/user/settings`

Retorna as configurações do usuário ou valores padrão se não existirem.

**Resposta:**

```json
{
  "settings": {
    "email_notifications": true,
    "push_notifications": false,
    "budget_alerts": true,
    "transaction_alerts": true,
    "theme": "system",
    "language": "pt-br",
    "currency": "BRL",
    "date_format": "dd/mm/yyyy",
    "week_start": "sunday",
    "session_timeout": "30"
  }
}
```

### PATCH `/api/user/settings`

Atualiza as configurações do usuário (cria se não existir).

**Body:**

```json
{
  "theme": "dark",
  "currency": "USD",
  "budget_alerts": false
}
```

### GET `/api/user/stats`

Retorna estatísticas completas da conta do usuário.

**Resposta:**

```json
{
  "accounts": {
    "total": 3,
    "total_assets": 15000.0,
    "total_liabilities": 2000.0,
    "net_worth": 13000.0
  },
  "transactions": {
    "total": 245,
    "total_income": 50000.0,
    "total_expenses": 35000.0,
    "net_savings": 15000.0,
    "days_since_start": 120,
    "avg_daily_expenses": 291.67
  },
  "goals": {
    "total": 5,
    "completed": 2,
    "completion_rate": 40.0
  }
}
```

### PATCH `/api/user/password`

Altera a senha do usuário com verificação de segurança.

**Body:**

```json
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha_forte"
}
```

### GET `/api/user/export?format=json|csv`

Exporta todos os dados do usuário.

**Formato JSON:**

- Estrutura completa com metadados
- Todos os dados normalizados
- Resumo estatístico incluído

**Formato CSV:**

- Múltiplas seções
- Dados prontos para Excel/Google Sheets
- Inclui nomes legíveis em vez de IDs

## 🗄️ Estrutura do Banco de Dados

### Tabela `user_settings`

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email_notifications BOOLEAN,
  push_notifications BOOLEAN,
  budget_alerts BOOLEAN,
  transaction_alerts BOOLEAN,
  theme VARCHAR(20),
  language VARCHAR(10),
  currency VARCHAR(3),
  date_format VARCHAR(20),
  week_start VARCHAR(10),
  session_timeout VARCHAR(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id)
);
```

## 🚀 Como Executar a Migration

Se a tabela `user_settings` ainda não existir no seu banco:

```bash
# No terminal do PowerShell
psql $DATABASE_URL -f scripts/ensure-user-settings.sql
```

Ou execute manualmente no Neon SQL Editor:

1. Acesse console.neon.tech
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Cole o conteúdo de `scripts/ensure-user-settings.sql`
5. Execute

## ✨ Melhorias de UX

1. **Indicador de Mudanças**: Botão "Salvar Alterações" aparece apenas quando há mudanças não salvas
2. **Loading States**: Skeletons durante carregamento inicial
3. **Feedback Imediato**: Toasts de sucesso/erro para todas as ações
4. **Validação de Senha**: Verifica comprimento mínimo e correspondência
5. **Estatísticas Visuais**: Cards coloridos com ícones para cada métrica
6. **Exportação Inteligente**: Nome do arquivo inclui data automática

## 🔧 Tipos TypeScript

Todos os tipos estão devidamente tipados:

- `UserSettings`: Interface para configurações
- `UserStats`: Interface para estatísticas
- Respostas de API validadas

## 📝 Notas

- Todas as configurações têm valores padrão
- A migration é idempotente (pode ser executada múltiplas vezes)
- Senhas são hasheadas com bcrypt (salt rounds: 10)
- Exportações incluem dados completos e normalizados
- Estatísticas são calculadas em tempo real do banco de dados
