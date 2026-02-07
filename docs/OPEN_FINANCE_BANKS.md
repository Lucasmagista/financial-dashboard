# 🏦 Tratamento de Dados por Tipo de Instituição

Este documento explica como diferentes tipos de contas e instituições são tratadas na sincronização Open Finance.

## 📊 Tipos de Conta Suportados

### 1. **Contas Bancárias (BANK)**

- **Subtipos**: `CHECKING_ACCOUNT`, `SAVINGS_ACCOUNT`
- **Campo de Saldo**: `balance`
- **Interpretação**:
  - Valor positivo = saldo disponível
  - Transações positivas = receitas (depósitos, transferências recebidas)
  - Transações negativas = despesas (saques, pagamentos)

**Exemplo: Nubank, Inter, C6 Bank**

```typescript
{
  type: "BANK",
  subtype: "CHECKING_ACCOUNT",
  balance: 1500.00,  // R$ 1.500,00 disponíveis
  name: "Conta Corrente"
}
```

### 2. **Cartões de Crédito (CREDIT)**

- **Subtipos**: `CREDIT_CARD`
- **Campos Especiais**: `creditData`
  - `availableCreditLimit`: Limite disponível para uso
  - `creditLimit`: Limite total do cartão
  - `minimumPayment`: Pagamento mínimo da fatura
  - `balance`: Valor da fatura atual (dívida)

**Interpretação**:

- Usamos `availableCreditLimit` como saldo (quanto ainda pode gastar)
- Todas as transações são **despesas** (compras)
- Valores sempre positivos no banco de dados

**Exemplo: Nubank Cartão, Mercado Pago**

```typescript
{
  type: "CREDIT",
  subtype: "CREDIT_CARD",
  balance: -500.00,  // Dívida atual (não usado)
  creditData: {
    availableCreditLimit: 4500.00,  // Usado como saldo
    creditLimit: 5000.00,
    minimumPayment: 50.00,
    balanceCloseDate: "2026-02-05"
  },
  name: "Cartão de Crédito"
}
```

### 3. **Contas de Investimento**

- **Tipo**: `INVESTMENT`
- **Campo de Saldo**: `balance`
- **Interpretação**: Valor total aplicado

## 🔄 Mapeamento de Tipos

| Pluggy Type  | Pluggy Subtype     | Nossa Categoria | Saldo Usado                       |
| ------------ | ------------------ | --------------- | --------------------------------- |
| `BANK`       | `CHECKING_ACCOUNT` | `checking`      | `balance`                         |
| `BANK`       | `SAVINGS_ACCOUNT`  | `savings`       | `balance`                         |
| `CREDIT`     | `CREDIT_CARD`      | `credit_card`   | `creditData.availableCreditLimit` |
| `INVESTMENT` | -                  | `investment`    | `balance`                         |
| Outros       | -                  | `other`         | `balance`                         |

## 💳 Casos Especiais por Instituição

### Mercado Pago

- Conta principal: tipo `BANK`
- Cartão de crédito: tipo `CREDIT` com `creditData`
- **Importante**: Sempre usar `availableCreditLimit` para saldo do cartão

### Nubank

- Conta NuConta: tipo `BANK`, subtype `CHECKING_ACCOUNT`
- Cartão Nubank: tipo `CREDIT`, subtype `CREDIT_CARD`
- Transações incluem categoria automática

### Banco Inter

- Conta Corrente: tipo `BANK`
- Poupança: tipo `BANK`, subtype `SAVINGS_ACCOUNT`
- Cartão: tipo `CREDIT`

### C6 Bank

- Conta: tipo `BANK`
- Cartão: tipo `CREDIT`
- Pode incluir investimentos: tipo `INVESTMENT`

### Bancos Tradicionais (Itaú, Bradesco, Santander, BB, Caixa)

- Múltiplas contas possíveis
- Tipos bem definidos (`CHECKING_ACCOUNT`, `SAVINGS_ACCOUNT`, `CREDIT_CARD`)
- Dados mais estruturados

## 📝 Tratamento de Transações

### ⚠️ Regra de Sinais na API Pluggy

**IMPORTANTE**: A API Pluggy usa a seguinte convenção:

- ✅ **Valor POSITIVO** = Entrada de dinheiro (receita)
- ❌ **Valor NEGATIVO** = Saída de dinheiro (despesa)

Isso vale para:

- PIX recebidos → positivo
- PIX enviados → negativo
- Transferências recebidas → positivo
- Transferências enviadas → negativo
- Depósitos → positivo
- Pagamentos/Saques → negativo

### Contas Bancárias

```typescript
// Sinal determina tipo
transaction.amount > 0 → income (receita/PIX recebido)
transaction.amount < 0 → expense (despesa/PIX enviado)

// Valor absoluto sempre salvo no DB
amount: Math.abs(transaction.amount)
```

### Cartões de Crédito

```typescript
// Sempre despesa, independente do sinal
type: "expense";

// Informações de parcelamento
if (transaction.creditCardMetadata) {
  description += ` (${instalmentNumber}/${totalInstallments})`;
}
```

### 💰 PIX - Tratamento Especial

PIX são identificados automaticamente quando `transaction.paymentData.paymentMethod` contém "PIX".

**PIX Recebido**:

```typescript
{
  amount: 100.00,  // POSITIVO
  type: 'income',
  description: 'PIX: João Silva (De: João Silva)',
  paymentData: {
    payer: 'João Silva',
    paymentMethod: 'PIX'
  }
}
```

**PIX Enviado**:

```typescript
{
  amount: -50.00,  // NEGATIVO
  type: 'expense',
  description: 'PIX: Supermercado (Para: Supermercado)',
  paymentData: {
    receiver: 'Supermercado',
    paymentMethod: 'PIX'
  }
}
```

## 🐛 Problemas Comuns e Soluções

### ❌ Problema: PIX recebidos não aparecem

**Causa**: Estava usando `amount >= 0` em vez de `amount > 0`  
**Solução**: ✅ Corrigido - agora detecta valores positivos como receita

### ❌ Problema: Saldo do cartão aparece errado

**Causa**: Usando `balance` em vez de `creditData.availableCreditLimit`  
**Solução**: Sempre verificar se existe `creditData` e usar o campo correto

### ❌ Problema: Transações duplicadas

**Causa**: Sincronizando período muito longo  
**Solução**: Usar período de 7 dias por padrão, detectar por `open_finance_id`

### ❌ Problema: Valores negativos no dashboard

**Causa**: Não tratando tipos de conta corretamente  
**Solução**: Separar ativos (contas) de passivos (cartões) nos cálculos

### ❌ Problema: Transações de cartão como receita

**Causa**: Não verificando tipo da conta  
**Solução**: Sempre classificar transações de `credit_card` como despesa

## 🔍 Debugging

Para verificar dados recebidos da API Pluggy, veja os logs no console:

```typescript
console.log("[v0] Processing account:", {
  id: account.id,
  type: account.type,
  subtype: account.subtype,
  balance: account.balance,
  creditData: account.creditData,
});
```

## 📚 Referências

- [Pluggy API Docs](https://docs.pluggy.ai)
- [Open Finance Brasil](https://openbankingbrasil.org.br/)
- [Banco Central - Open Finance](https://www.bcb.gov.br/estabilidadefinanceira/openbanking)
