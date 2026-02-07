# 🔗 Guia de Integração Open Finance

Este documento explica como integrar seu dashboard financeiro com provedores reais de Open Finance no Brasil.

## 📋 O que é Open Finance?

Open Finance (antigo Open Banking) é um sistema regulamentado pelo Banco Central do Brasil que permite o compartilhamento seguro de dados financeiros entre instituições autorizadas. Permite que aplicativos terceirizados acessem informações bancárias com o consentimento do usuário.

## 🏦 Provedores Recomendados

### 1. **Pluggy** (Recomendado)
- **Site**: https://pluggy.ai
- **Vantagens**: API simples, boa documentação, suporte em português
- **Preço**: Plano gratuito para desenvolvimento, pago por transação em produção
- **Bancos**: 100+ instituições brasileiras

### 2. **Belvo**
- **Site**: https://belvo.com
- **Vantagens**: Cobertura América Latina, robusta
- **Preço**: Pago por API call
- **Bancos**: 50+ instituições brasileiras

### 3. **Bankly**
- **Site**: https://bankly.com.br
- **Vantagens**: Solução brasileira completa
- **Preço**: Planos customizados
- **Bancos**: Principais bancos brasileiros

## 🚀 Implementação com Pluggy (Exemplo)

### Passo 1: Criar Conta e Obter Credenciais

1. Registre-se em https://dashboard.pluggy.ai
2. Crie uma aplicação
3. Obtenha suas credenciais:
   - `CLIENT_ID`
   - `CLIENT_SECRET`

### Passo 2: Instalar SDK

```bash
npm install pluggy-sdk
```

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
PLUGGY_CLIENT_ID=seu_client_id
PLUGGY_CLIENT_SECRET=seu_client_secret
```

### Passo 4: Criar Cliente Pluggy

Crie `/lib/pluggy.ts`:

```typescript
import { PluggyClient } from 'pluggy-sdk';

if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
  throw new Error('Pluggy credentials not configured');
}

export const pluggy = new PluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
});
```

### Passo 5: Implementar Fluxo de Conexão

Atualize `/app/api/open-finance/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { pluggy } from '@/lib/pluggy';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId } = body; // itemId retornado do Pluggy Connect Widget

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    // Buscar informações da conexão
    const item = await pluggy.fetchItem(itemId);
    
    // Buscar contas conectadas
    const accounts = await pluggy.fetchAccounts(itemId);

    // Salvar conexão no banco
    const connection = await sql`
      INSERT INTO open_finance_connections (
        user_id,
        item_id,
        institution_name,
        status,
        expires_at
      )
      VALUES (
        ${user.id},
        ${itemId},
        ${item.connector.name},
        'active',
        ${item.executionStatus === 'SUCCESS' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null}
      )
      RETURNING *
    `;

    // Criar contas no banco
    for (const account of accounts) {
      await sql`
        INSERT INTO accounts (
          user_id,
          name,
          type,
          balance,
          currency,
          bank_name,
          is_connected,
          external_id
        )
        VALUES (
          ${user.id},
          ${account.name},
          ${account.type === 'CREDIT' ? 'credit_card' : 'checking'},
          ${account.balance},
          ${account.currencyCode},
          ${item.connector.name},
          true,
          ${account.id}
        )
        ON CONFLICT (external_id) DO UPDATE
        SET balance = ${account.balance},
            last_sync = NOW()
      `;
    }

    // Buscar transações
    const transactions = await pluggy.fetchTransactions(itemId);

    // Importar transações
    for (const tx of transactions) {
      // Encontrar conta correspondente
      const accountResult = await sql`
        SELECT id FROM accounts WHERE external_id = ${tx.accountId}
      `;
      
      if (accountResult.length > 0) {
        await sql`
          INSERT INTO transactions (
            account_id,
            amount,
            type,
            description,
            date,
            merchant,
            external_id
          )
          VALUES (
            ${accountResult[0].id},
            ${Math.abs(tx.amount)},
            ${tx.amount > 0 ? 'income' : 'expense'},
            ${tx.description},
            ${new Date(tx.date)},
            ${tx.merchant?.name || null},
            ${tx.id}
          )
          ON CONFLICT (external_id) DO NOTHING
        `;
      }
    }

    return NextResponse.json({
      success: true,
      connection: connection[0],
      accounts: accounts.length,
      transactions: transactions.length,
    });
  } catch (error) {
    console.error('[v0] Error connecting Open Finance:', error);
    return NextResponse.json(
      { error: 'Failed to connect' },
      { status: 500 }
    );
  }
}
```

### Passo 6: Adicionar Widget Pluggy Connect

Crie `/components/pluggy-connect.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    PluggyConnect: any;
  }
}

export function PluggyConnectButton() {
  useEffect(() => {
    // Carregar script do Pluggy
    const script = document.createElement('script');
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.5.0/pluggy-connect.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleConnect = () => {
    if (typeof window !== 'undefined' && window.PluggyConnect) {
      const pluggyConnect = new window.PluggyConnect({
        connectToken: 'SEU_CONNECT_TOKEN', // Gerar via API
        includeSandbox: true, // true em dev, false em prod
        onSuccess: async (itemData: any) => {
          // Enviar itemId para seu backend
          const response = await fetch('/api/open-finance/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: itemData.item.id }),
          });

          if (response.ok) {
            window.location.reload();
          }
        },
        onError: (error: any) => {
          console.error('Pluggy error:', error);
        },
      });

      pluggyConnect.init();
    }
  };

  return (
    <Button onClick={handleConnect}>
      Conectar Banco via Pluggy
    </Button>
  );
}
```

### Passo 7: Adicionar external_id nas Tabelas

Execute o seguinte SQL para adicionar suporte a IDs externos:

```sql
-- Adicionar coluna external_id em accounts
ALTER TABLE accounts 
ADD COLUMN external_id VARCHAR(255) UNIQUE;

-- Adicionar coluna external_id em transactions
ALTER TABLE transactions 
ADD COLUMN external_id VARCHAR(255) UNIQUE;

-- Adicionar item_id em open_finance_connections
ALTER TABLE open_finance_connections 
ADD COLUMN item_id VARCHAR(255);
```

## 🔄 Sincronização Automática

### Criar Job de Sincronização

Crie `/app/api/cron/sync-transactions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { pluggy } from '@/lib/pluggy';

export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma requisição válida (Vercel Cron ou API key)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todas as conexões ativas
    const connections = await sql`
      SELECT * FROM open_finance_connections
      WHERE status = 'active'
      AND expires_at > NOW()
    `;

    let syncedCount = 0;

    for (const connection of connections) {
      try {
        // Buscar transações recentes (últimos 30 dias)
        const transactions = await pluggy.fetchTransactions(
          connection.item_id,
          { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        );

        // Importar transações novas
        for (const tx of transactions) {
          const accountResult = await sql`
            SELECT id FROM accounts WHERE external_id = ${tx.accountId}
          `;

          if (accountResult.length > 0) {
            await sql`
              INSERT INTO transactions (
                account_id,
                amount,
                type,
                description,
                date,
                merchant,
                external_id
              )
              VALUES (
                ${accountResult[0].id},
                ${Math.abs(tx.amount)},
                ${tx.amount > 0 ? 'income' : 'expense'},
                ${tx.description},
                ${new Date(tx.date)},
                ${tx.merchant?.name || null},
                ${tx.id}
              )
              ON CONFLICT (external_id) DO NOTHING
            `;
          }
        }

        // Atualizar last_sync
        await sql`
          UPDATE open_finance_connections
          SET last_sync = NOW()
          WHERE id = ${connection.id}
        `;

        syncedCount++;
      } catch (error) {
        console.error(`Error syncing connection ${connection.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: connections.length,
    });
  } catch (error) {
    console.error('[v0] Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
```

### Configurar Vercel Cron

Crie `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## 🔒 Segurança e Compliance

### Checklist de Segurança

- [ ] Criptografar tokens de acesso no banco de dados
- [ ] Implementar rate limiting nas APIs
- [ ] Validar webhooks do provedor
- [ ] Log de todas as operações sensíveis
- [ ] Implementar 2FA para usuários
- [ ] Expirar sessões regularmente
- [ ] Auditar acessos aos dados

### Compliance LGPD

1. **Consentimento Explícito**: Usuário deve concordar claramente com o compartilhamento
2. **Transparência**: Informar quais dados serão coletados
3. **Direito ao Esquecimento**: Permitir deletar todos os dados
4. **Portabilidade**: Exportar dados em formato legível
5. **Notificação de Incidentes**: Alertar sobre vazamentos em 72h

### Termos de Uso Open Finance

Você DEVE:
- Ter registro no Banco Central (para produção)
- Respeitar limites de consentimento (90 dias)
- Implementar renovação de consentimento
- Permitir revogação a qualquer momento
- Não compartilhar dados com terceiros sem consentimento

## 📚 Recursos Úteis

- [Pluggy Documentation](https://docs.pluggy.ai)
- [Open Finance Brasil](https://openbankingbrasil.org.br)
- [Banco Central - Open Finance](https://www.bcb.gov.br/estabilidadefinanceira/openbanking)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd)

## 🆘 Troubleshooting

### Erro: "Invalid credentials"
- Verifique se CLIENT_ID e CLIENT_SECRET estão corretos
- Confirme se está usando ambiente correto (sandbox vs production)

### Erro: "Connection expired"
- Conexões Open Finance expiram após 90 dias
- Implemente renovação automática de consentimento

### Erro: "Transaction already exists"
- Use `external_id` UNIQUE para evitar duplicatas
- Use `ON CONFLICT DO NOTHING` no SQL

## 💡 Próximos Passos

1. Implementar este guia passo a passo
2. Testar com banco sandbox
3. Implementar renovação de consentimento
4. Adicionar notificações de sincronização
5. Criar dashboard de status das conexões
6. Adicionar categorização automática com IA
7. Solicitar registro no Banco Central para produção

---

**Nota**: Este é um guia de implementação. Sempre consulte a documentação oficial do provedor escolhido e as regulamentações do Banco Central.
