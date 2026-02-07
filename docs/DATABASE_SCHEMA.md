# 🗄️ Esquema do Banco de Dados

Este documento descreve a estrutura completa do banco de dados PostgreSQL do FinanceDash.

## 📊 Diagrama de Relacionamentos

```
users (1) ──┬── (N) accounts
            │
            ├── (N) categories
            │
            ├── (N) budgets
            │
            ├── (N) goals
            │
            └── (N) open_finance_connections

accounts (1) ──── (N) transactions

categories (1) ──┬── (N) transactions
                 │
                 └── (N) budgets
```

## 📋 Tabelas

### 1. `users`
Armazena informações dos usuários do sistema.

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único do usuário | PRIMARY KEY |
| `email` | VARCHAR(255) | Email do usuário | UNIQUE, NOT NULL |
| `name` | VARCHAR(255) | Nome completo | NOT NULL |
| `password_hash` | VARCHAR(255) | Hash da senha | NOT NULL |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Índices:**
- `idx_users_email` em `email`

**Exemplo:**
```sql
INSERT INTO users (email, name, password_hash)
VALUES ('joao@exemplo.com', 'João Silva', '$2b$10$...');
```

---

### 2. `accounts`
Representa contas bancárias do usuário (corrente, poupança, investimento, cartão).

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único da conta | PRIMARY KEY |
| `user_id` | INTEGER | Referência ao usuário | FK → users(id) |
| `name` | VARCHAR(255) | Nome da conta | NOT NULL |
| `type` | account_type | Tipo da conta | NOT NULL |
| `balance` | DECIMAL(15,2) | Saldo atual | DEFAULT 0 |
| `currency` | VARCHAR(3) | Moeda (BRL, USD) | DEFAULT 'BRL' |
| `bank_name` | VARCHAR(255) | Nome do banco | |
| `is_connected` | BOOLEAN | Conectada via Open Finance | DEFAULT false |
| `last_sync` | TIMESTAMP | Última sincronização | |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Enum `account_type`:**
- `checking` - Conta Corrente
- `savings` - Poupança
- `investment` - Investimento
- `credit_card` - Cartão de Crédito

**Índices:**
- `idx_accounts_user_id` em `user_id`

**Exemplo:**
```sql
INSERT INTO accounts (user_id, name, type, balance, currency, bank_name)
VALUES (1, 'Nubank', 'checking', 5000.00, 'BRL', 'Nubank');
```

---

### 3. `transactions`
Registra todas as transações financeiras (receitas e despesas).

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único da transação | PRIMARY KEY |
| `account_id` | INTEGER | Referência à conta | FK → accounts(id) |
| `category_id` | INTEGER | Referência à categoria | FK → categories(id) |
| `amount` | DECIMAL(15,2) | Valor da transação | NOT NULL |
| `type` | transaction_type | Tipo (receita/despesa) | NOT NULL |
| `description` | TEXT | Descrição | NOT NULL |
| `date` | DATE | Data da transação | NOT NULL |
| `merchant` | VARCHAR(255) | Estabelecimento | |
| `is_recurring` | BOOLEAN | Transação recorrente | DEFAULT false |
| `created_at` | TIMESTAMP | Data de registro | DEFAULT NOW() |

**Enum `transaction_type`:**
- `income` - Receita
- `expense` - Despesa

**Índices:**
- `idx_transactions_account_id` em `account_id`
- `idx_transactions_category_id` em `category_id`
- `idx_transactions_date` em `date`

**Exemplo:**
```sql
INSERT INTO transactions (account_id, category_id, amount, type, description, date)
VALUES (1, 3, 150.00, 'expense', 'Compra no supermercado', '2024-01-15');
```

---

### 4. `categories`
Categorias para organizar transações.

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único da categoria | PRIMARY KEY |
| `user_id` | INTEGER | Referência ao usuário | FK → users(id) |
| `name` | VARCHAR(100) | Nome da categoria | NOT NULL |
| `type` | transaction_type | Tipo (receita/despesa) | NOT NULL |
| `color` | VARCHAR(7) | Cor em hex (#FF5733) | NOT NULL |
| `icon` | VARCHAR(50) | Nome do ícone | NOT NULL |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Índices:**
- `idx_categories_user_id` em `user_id`

**Categorias Padrão:**
```sql
-- Despesas
INSERT INTO categories (user_id, name, type, color, icon) VALUES
(1, 'Alimentação', 'expense', '#FF6B6B', 'utensils'),
(1, 'Transporte', 'expense', '#4ECDC4', 'car'),
(1, 'Moradia', 'expense', '#95E1D3', 'home'),
(1, 'Saúde', 'expense', '#F38181', 'heart'),
(1, 'Educação', 'expense', '#AA96DA', 'book');

-- Receitas
INSERT INTO categories (user_id, name, type, color, icon) VALUES
(1, 'Salário', 'income', '#A8E6CF', 'dollar-sign'),
(1, 'Freelance', 'income', '#FFD3B6', 'briefcase');
```

---

### 5. `budgets`
Orçamentos definidos por categoria.

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único do orçamento | PRIMARY KEY |
| `user_id` | INTEGER | Referência ao usuário | FK → users(id) |
| `category_id` | INTEGER | Referência à categoria | FK → categories(id) |
| `amount` | DECIMAL(15,2) | Valor do orçamento | NOT NULL |
| `period` | budget_period | Período do orçamento | NOT NULL |
| `start_date` | DATE | Data de início | NOT NULL |
| `end_date` | DATE | Data de fim | |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Enum `budget_period`:**
- `monthly` - Mensal
- `weekly` - Semanal
- `yearly` - Anual

**Índices:**
- `idx_budgets_user_id` em `user_id`
- `idx_budgets_category_id` em `category_id`

**Exemplo:**
```sql
INSERT INTO budgets (user_id, category_id, amount, period, start_date)
VALUES (1, 3, 1000.00, 'monthly', '2024-01-01');
```

---

### 6. `goals`
Metas financeiras do usuário.

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único da meta | PRIMARY KEY |
| `user_id` | INTEGER | Referência ao usuário | FK → users(id) |
| `name` | VARCHAR(255) | Nome da meta | NOT NULL |
| `target_amount` | DECIMAL(15,2) | Valor alvo | NOT NULL |
| `current_amount` | DECIMAL(15,2) | Valor atual | DEFAULT 0 |
| `deadline` | DATE | Prazo para atingir | |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Índices:**
- `idx_goals_user_id` em `user_id`

**Exemplo:**
```sql
INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
VALUES (1, 'Viagem para Europa', 15000.00, 3000.00, '2024-12-31');
```

---

### 7. `open_finance_connections`
Conexões com bancos via Open Finance.

| Coluna | Tipo | Descrição | Restrições |
|--------|------|-----------|------------|
| `id` | SERIAL | ID único da conexão | PRIMARY KEY |
| `user_id` | INTEGER | Referência ao usuário | FK → users(id) |
| `institution_name` | VARCHAR(255) | Nome do banco | NOT NULL |
| `consent_id` | VARCHAR(255) | ID do consentimento | |
| `access_token` | TEXT | Token de acesso | |
| `status` | connection_status | Status da conexão | DEFAULT 'active' |
| `expires_at` | TIMESTAMP | Data de expiração | |
| `last_sync` | TIMESTAMP | Última sincronização | |
| `created_at` | TIMESTAMP | Data de criação | DEFAULT NOW() |

**Enum `connection_status`:**
- `active` - Ativa
- `expired` - Expirada
- `revoked` - Revogada

**Índices:**
- `idx_open_finance_user_id` em `user_id`

**Exemplo:**
```sql
INSERT INTO open_finance_connections (user_id, institution_name, consent_id, status)
VALUES (1, 'Nubank', 'consent_123456', 'active');
```

## 🔍 Queries Úteis

### Ver patrimônio líquido do usuário
```sql
SELECT 
  SUM(CASE WHEN type IN ('checking', 'savings', 'investment') THEN balance ELSE 0 END) as total_assets,
  SUM(CASE WHEN type = 'credit_card' THEN ABS(balance) ELSE 0 END) as total_liabilities,
  SUM(CASE WHEN type IN ('checking', 'savings', 'investment') THEN balance ELSE 0 END) - 
  SUM(CASE WHEN type = 'credit_card' THEN ABS(balance) ELSE 0 END) as net_worth
FROM accounts 
WHERE user_id = 1;
```

### Gastos por categoria (mês atual)
```sql
SELECT 
  c.name as category,
  c.color,
  SUM(t.amount) as total
FROM transactions t
JOIN accounts a ON t.account_id = a.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE a.user_id = 1
  AND t.type = 'expense'
  AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY c.id, c.name, c.color
ORDER BY total DESC;
```

### Receitas vs Despesas (últimos 6 meses)
```sql
SELECT 
  TO_CHAR(t.date, 'YYYY-MM') as month,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.user_id = 1
  AND t.date >= NOW() - INTERVAL '6 months'
GROUP BY TO_CHAR(t.date, 'YYYY-MM')
ORDER BY month ASC;
```

### Orçamentos com progresso
```sql
SELECT 
  b.*,
  c.name as category_name,
  c.color as category_color,
  COALESCE(SUM(t.amount), 0) as spent
FROM budgets b
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN transactions t ON t.category_id = b.category_id 
  AND t.date >= b.start_date 
  AND (b.end_date IS NULL OR t.date <= b.end_date)
  AND t.type = 'expense'
WHERE b.user_id = 1
GROUP BY b.id, c.name, c.color
ORDER BY b.created_at DESC;
```

## 🔧 Migrations Futuras

### Adicionar suporte a múltiplas moedas
```sql
ALTER TABLE transactions ADD COLUMN currency VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE transactions ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT 1.0;
```

### Adicionar tags às transações
```sql
CREATE TABLE transaction_tags (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
```

### Adicionar notificações
```sql
CREATE TYPE notification_type AS ENUM ('budget_alert', 'goal_achieved', 'unusual_transaction', 'sync_failed');

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

## 🛡️ Segurança

### Row Level Security (RLS)
```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só pode ver seus próprios dados
CREATE POLICY accounts_policy ON accounts
  USING (user_id = current_setting('app.user_id')::INTEGER);

CREATE POLICY transactions_policy ON transactions
  USING (account_id IN (
    SELECT id FROM accounts WHERE user_id = current_setting('app.user_id')::INTEGER
  ));
```

## 📊 Performance

### Índices Compostos Recomendados
```sql
-- Para queries de transações por usuário e data
CREATE INDEX idx_transactions_user_date ON transactions (
  (SELECT user_id FROM accounts WHERE accounts.id = transactions.account_id),
  date DESC
);

-- Para análise de gastos por categoria e período
CREATE INDEX idx_transactions_category_date ON transactions (category_id, date DESC);
```

## 🔄 Backup e Restore

### Backup
```bash
pg_dump -h seu-host.neon.tech -U seu-usuario -d seu-banco > backup.sql
```

### Restore
```bash
psql -h seu-host.neon.tech -U seu-usuario -d seu-banco < backup.sql
```

---

**Última atualização**: Janeiro 2024
**Versão do Schema**: 1.0
