# Gestão Avançada de Transações - Documentação Completa

## ✅ Recursos Implementados

### 1. Upload de Comprovantes (Vercel Blob)

**Endpoint:** `POST /api/transactions/[id]/receipt`

Upload de comprovantes em formato JPEG, PNG, WebP ou PDF (máx 5MB).

```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch(`/api/transactions/${id}/receipt`, {
  method: 'POST',
  body: formData,
});
```

**Features:**
- Upload automático para Vercel Blob
- Substituição automática de comprovantes antigos
- Validação de tipo e tamanho
- URL pública gerada automaticamente

### 2. Busca Full-Text

**Endpoint:** `GET /api/transactions/search?q=termo&page=1&limit=20`

Busca inteligente usando PostgreSQL full-text search com ranking.

```typescript
const response = await fetch('/api/transactions/search?q=mercado');
const { transactions, total, rank } = await response.json();
```

**Features:**
- Busca em português (stemming)
- Ranking por relevância
- Busca em descrição e notas
- Índices otimizados com GIN

### 3. Filtros Avançados Combinados

**Endpoint:** `POST /api/transactions/filter`

Filtros múltiplos combinados com performance otimizada.

```typescript
const response = await fetch('/api/transactions/filter', {
  method: 'POST',
  body: JSON.stringify({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    type: 'expense',
    categoryIds: ['cat-id-1', 'cat-id-2'],
    accountIds: ['acc-id-1'],
    tags: ['importante', 'recorrente'],
    minAmount: 100,
    maxAmount: 1000,
    hasReceipt: true,
    isRecurring: false,
  }),
});
```

**Filtros Disponíveis:**
- Data (range com início e fim)
- Tipo (receita/despesa/transferência)
- Categorias (múltiplas)
- Contas (múltiplas)
- Tags (array matching)
- Valor (min/max)
- Com/sem comprovante
- Recorrente sim/não

### 4. Edição em Massa

**Endpoint:** `PATCH /api/transactions/bulk`

Editar até 100 transações simultaneamente.

```typescript
const response = await fetch('/api/transactions/bulk', {
  method: 'PATCH',
  body: JSON.stringify({
    transactionIds: ['id1', 'id2', 'id3'],
    updates: {
      categoryId: 'new-category-id',
      tags: ['tag1', 'tag2'],
    },
  }),
});
```

**Endpoint:** `DELETE /api/transactions/bulk`

Deletar múltiplas transações (inclui deleção automática de comprovantes).

### 5. Duplicar Transações

**Endpoint:** `POST /api/transactions/[id]/duplicate`

Duplicar transação com data customizada ou múltiplas cópias.

```typescript
const response = await fetch(`/api/transactions/${id}/duplicate`, {
  method: 'POST',
  body: JSON.stringify({
    date: '2026-02-01',
    count: 3, // Cria 3 cópias em dias consecutivos
  }),
});
```

### 6. Transações Recorrentes Automáticas

**Endpoint:** `POST /api/transactions/recurring`

Criar template de transação recorrente.

```typescript
const response = await fetch('/api/transactions/recurring', {
  method: 'POST',
  body: JSON.stringify({
    accountId: 'account-id',
    categoryId: 'category-id',
    amount: 1500.00,
    type: 'expense',
    description: 'Aluguel',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-05',
    endDate: '2026-12-05', // Opcional
    tags: ['casa', 'fixo'],
    notes: 'Pagamento automático',
  }),
});
```

**Frequências Suportadas:**
- `daily` - Diário
- `weekly` - Semanal
- `monthly` - Mensal
- `yearly` - Anual

**Cron Job:**
- Endpoint: `GET /api/cron/process-recurring`
- Execução: Diária
- Processa automaticamente templates ativos
- Calcula próxima execução
- Cria transações no histórico

**Configurar no Vercel:**
```bash
# No dashboard Vercel > Settings > Cron Jobs
# Adicionar:
# Path: /api/cron/process-recurring
# Schedule: 0 2 * * * (2AM diariamente)
# Headers: Authorization: Bearer ${CRON_SECRET}
```

### 7. Categorização Automática Inteligente

**Endpoint:** `POST /api/transactions/[id]/categorize`

Categorização baseada em regras + aprendizado histórico.

```typescript
const response = await fetch(`/api/transactions/${id}/categorize`, {
  method: 'POST',
});
```

**Como Funciona:**

1. **Regras Built-in:** 40+ palavras-chave para categorias comuns
2. **Aprendizado Histórico:** Analisa transações similares do usuário
3. **Confidence Score:** 0.0 a 1.0 (só aplica se > 0.7)
4. **Normalização:** Remove acentos e converte para lowercase

**Categorias Detectadas Automaticamente:**
- Alimentação (restaurante, ifood, supermercado...)
- Transporte (uber, gasolina, estacionamento...)
- Moradia (aluguel, luz, água, internet...)
- Lazer (cinema, netflix, spotify...)
- Saúde (farmácia, hospital, médico...)
- Educação (escola, curso, livros...)
- Compras (e-commerce geral)
- Salário (renda)

## 🗄️ Schema do Banco de Dados

Campos adicionados à tabela `transactions`:

```sql
receipt_url TEXT                    -- URL do comprovante no Blob
search_vector tsvector              -- Vetor para busca full-text
is_recurring BOOLEAN                -- Se é transação recorrente
recurring_frequency VARCHAR(20)     -- daily/weekly/monthly/yearly
recurring_interval INTEGER          -- Intervalo (ex: a cada 2 meses)
recurring_end_date DATE            -- Data fim da recorrência
parent_transaction_id UUID         -- ID do template pai
auto_categorized BOOLEAN           -- Se foi categorizada por ML
confidence_score DECIMAL(3,2)      -- Confiança da categorização
```

Nova tabela `recurring_transaction_templates`:
- Armazena templates de transações recorrentes
- Campos: frequência, intervalo, próxima execução
- Processada pelo cron job diariamente

## 📊 Performance

**Índices Criados:**
- `idx_transactions_search` - GIN index para full-text
- `idx_recurring_templates_next_run` - Para cron job
- `idx_transactions_recent` - Queries recentes

**Cache:**
- Busca full-text: 5 minutos
- Filtros complexos: 2 minutos
- Templates recorrentes: 10 minutos

## 🔒 Segurança

**Todas as APIs:**
- Autenticação obrigatória (JWT)
- Validação com Zod
- Audit logging completo
- Rate limiting (100 req/min)

**Upload de Arquivos:**
- Tipos permitidos: JPEG, PNG, WebP, PDF
- Tamanho máximo: 5MB
- Scan de vírus (Vercel Blob automático)
- URL pública mas não listável

## 🚀 Próximos Passos

Para usar todos os recursos:

1. **Configurar Cron Job no Vercel**
2. **Adicionar env var CRON_SECRET**
3. **Testar categorização com suas transações**
4. **Criar templates recorrentes para despesas fixas**
5. **Fazer upload de comprovantes importantes**

## 🎯 Uso Recomendado

**Transações Recorrentes:**
Use para: aluguel, salário, assinaturas, contas fixas.

**Categorização Automática:**
Executar em novas transações do Open Finance.

**Busca Full-Text:**
Encontrar despesas específicas rapidamente.

**Filtros Avançados:**
Análises mensais, auditorias, relatórios.
