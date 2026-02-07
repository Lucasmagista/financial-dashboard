import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { sql } from '@/lib/db';
import { getAccounts, getTransactions } from '@/lib/open-finance';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { sanitizeDescription, sanitizeNotes, sanitizeTags } from '@/lib/sanitization';
import { logAudit } from '@/lib/audit-log';

const SyncSchema = z.object({
  connection_id: z.union([z.number(), z.string().uuid()]),
  force: z.boolean().optional().default(false),
  days: z.number().min(1).max(90).optional().default(7), // Days to sync (1-90, default 7)
});
class NotFoundError extends Error {}

export async function syncConnectionInternal(params: { user: { id: string }; connectionId: string | number; days: number; force?: boolean }) {
  const { user, connectionId, days, force = false } = params;

  // Get connection
  const connections = await sql`
    SELECT * FROM open_finance_connections
    WHERE id = ${connectionId} AND user_id = ${user.id}
    LIMIT 1
  `;

  if (connections.length === 0) {
    throw new NotFoundError('Connection not found');
  }

  const connection = connections[0];

  // Fetch accounts from Pluggy
  let accountsSynced = 0;
  let transactionsSynced = 0;

  const pluggyAccounts = await getAccounts(connection.item_id);

  for (const account of pluggyAccounts) {
    logger.debug('[v0] Processing account:', {
      id: account.id,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      balance: account.balance,
      creditData: account.creditData,
      currencyCode: account.currencyCode
    });

    // Determine account type and balance based on Pluggy data
    let accountType: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other' = 'checking';
    let accountBalance = 0;
    let accountName = account.name || account.marketingName || 'Conta';
    
    // Map Pluggy types to our account types
    if (account.type === 'CREDIT' || account.subtype === 'CREDIT_CARD') {
      accountType = 'credit_card';
      
      // For credit cards, use the available credit or the balance
      if (account.creditData) {
        // availableCreditLimit = quanto ainda pode gastar
        // balance = geralmente o valor da fatura/dívida atual
        // creditLimit = limite total do cartão
        
        if (account.creditData.availableCreditLimit !== undefined) {
          // Saldo do cartão = limite disponível (positivo)
          accountBalance = Number(account.creditData.availableCreditLimit);
          logger.debug('[v0] Credit card - Using availableCreditLimit:', accountBalance);
        } else if (account.balance !== undefined) {
          // Se não tiver availableCreditLimit, usar balance (pode ser negativo = dívida)
          accountBalance = -Math.abs(Number(account.balance));
          logger.debug('[v0] Credit card - Using balance as debt:', accountBalance);
        } else {
          accountBalance = 0;
        }
        
        // Se tiver informações adicionais, logar
        if (account.creditData.creditLimit) {
          logger.debug('[v0] Credit card limit:', account.creditData.creditLimit);
        }
        if (account.creditData.minimumPayment) {
          logger.debug('[v0] Minimum payment:', account.creditData.minimumPayment);
        }
      } else {
        // Fallback se não tiver creditData
        accountBalance = Number(account.balance) || 0;
      }
    } else if (account.type === 'BANK') {
      // Contas bancárias normais
      if (account.subtype === 'SAVINGS_ACCOUNT') {
        accountType = 'savings';
      } else if (account.subtype === 'CHECKING_ACCOUNT') {
        accountType = 'checking';
      } else {
        accountType = 'checking'; // default
      }
      
      accountBalance = Number(account.balance) || 0;
      logger.debug('[v0] Bank account - Balance:', accountBalance);
    } else {
      // Outros tipos (investimento, etc)
      accountType = 'other';
      accountBalance = Number(account.balance) || 0;
    }

    // Check if account already exists
    const existingAccount = await sql`
      SELECT id FROM accounts
      WHERE open_finance_id = ${account.id} AND user_id = ${user.id}
      LIMIT 1
    `;

    if (existingAccount.length > 0) {
      // Update existing account
      await sql`
        UPDATE accounts
        SET balance = ${accountBalance}, 
            name = ${accountName},
            account_type = ${accountType},
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE id = ${existingAccount[0].id}
      `;
      logger.debug('open_finance.sync.account.updated', {
        accountId: existingAccount[0].id,
        accountType,
        accountBalance,
      });
    } else {
      // Insert new account
      const newAccount = await sql`
        INSERT INTO accounts (
          user_id, name, account_type, balance, currency,
          bank_name, open_finance_id, open_finance_provider, is_active
        )
        VALUES (
          ${user.id},
          ${accountName},
          ${accountType},
          ${accountBalance},
          ${account.currencyCode},
          ${connection.institution_name},
          ${account.id},
          'pluggy',
          true
        )
        RETURNING id
      `;
      logger.debug('open_finance.sync.account.created', {
        accountId: newAccount[0].id,
        accountType,
        accountBalance,
      });
    }
    
    accountsSynced++;

    // Fetch recent transactions (configurable days, default 7)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    
    logger.debug('open_finance.sync.tx.fetchWindow', {
      from: fromDate.toISOString().split('T')[0],
      days,
    });
    
    const transactions = await getTransactions(
      account.id,
      fromDate.toISOString().split('T')[0]
    );
    
    logger.debug('open_finance.sync.tx.count', {
      accountId: account.id,
      accountName: account.name,
      count: transactions.length,
    });

    for (const transaction of transactions) {
      // Log completo da transação para debug
      logger.debug('[v0] Raw transaction data:', {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        status: transaction.status,
      });

      // Get account ID from database
      const accountResult = await sql`
        SELECT id, account_type FROM accounts
        WHERE open_finance_id = ${account.id} AND user_id = ${user.id}
        LIMIT 1
      `;

      if (accountResult.length > 0) {
        const dbAccount = accountResult[0];
        
        // Check if transaction already exists by open_finance_id
        const existingTx = await sql`
          SELECT id FROM transactions
          WHERE open_finance_id = ${transaction.id}
          LIMIT 1
        `;

        if (existingTx.length === 0) {
          // Determine transaction type and amount
          let txAmount = Math.abs(Number(transaction.amount));
          let txType: 'income' | 'expense' = 'expense';
          
          // Para contas bancárias: positivo = receita, negativo = despesa
          // Para cartões de crédito: sempre despesa (valores positivos na API)
          if (dbAccount.account_type === 'credit_card') {
            txType = 'expense';
            // Transações de cartão de crédito são sempre despesas
          } else {
            // Para contas normais, verificar o sinal do amount original
            const originalAmount = Number(transaction.amount);
            
            // Na API Pluggy:
            // - Valores POSITIVOS = entrada de dinheiro (receita/PIX recebido)
            // - Valores NEGATIVOS = saída de dinheiro (despesa/PIX enviado)
            if (originalAmount > 0) {
              txType = 'income';
              logger.debug('[v0] ✅ INCOME detected (PIX/transfer received):', originalAmount);
            } else if (originalAmount < 0) {
              txType = 'expense';
              logger.debug('[v0] 💸 EXPENSE detected (payment/PIX sent):', originalAmount);
            } else {
              // Valor zero - classificar como expense por padrão
              txType = 'expense';
            }
          }
          
          // Melhorar descrição
          let description = sanitizeDescription(transaction.description || transaction.descriptionRaw || 'Transação');

          const tagSet = new Set<string>();
          const metaParts: string[] = [];
          
          // Adicionar informação de PIX se disponível
          if (transaction.paymentData) {
            const method = transaction.paymentData.paymentMethod?.toUpperCase();
            if (method) {
              tagSet.add(method.toLowerCase());
              metaParts.push(`Método: ${method}`);
            }

            if (method?.includes('PIX')) {
              description = `PIX: ${description}`;
              const payer = transaction.paymentData.payer ? sanitizeDescription(transaction.paymentData.payer) : undefined;
              const receiver = transaction.paymentData.receiver ? sanitizeDescription(transaction.paymentData.receiver) : undefined;

              if (payer && txType === 'income') {
                description = `${description} (De: ${payer})`;
                tagSet.add('pix-entrada');
              }
              if (receiver && txType === 'expense') {
                description = `${description} (Para: ${receiver})`;
                tagSet.add('pix-saida');
              }
            }

            if (transaction.paymentData.referenceNumber) {
              metaParts.push(`Ref: ${transaction.paymentData.referenceNumber}`);
              tagSet.add('ref');
            }
          }
          
          // Se for cartão de crédito com installment info, adicionar
          if (transaction.creditCardMetadata) {
            const meta = transaction.creditCardMetadata;
            if (meta.totalInstallments && meta.totalInstallments > 1) {
              description += ` (${meta.instalmentNumber}/${meta.totalInstallments})`;
              metaParts.push(`Parcelas: ${meta.instalmentNumber}/${meta.totalInstallments}`);
              tagSet.add('parcelado');
            }
            if (meta.payeeName) {
              const payeeName = sanitizeDescription(meta.payeeName);
              description = `${payeeName} - ${description}`;
              metaParts.push(`Estabelecimento: ${payeeName}`);
              tagSet.add('cartao');
            }
            if (meta.mcc) {
              metaParts.push(`MCC: ${meta.mcc}`);
              tagSet.add('mcc');
            }
          }

          if (transaction.category) {
            metaParts.push(`Categoria banco: ${transaction.category}`);
            tagSet.add('categoria-banco');
          }
          if (transaction.status) {
            metaParts.push(`Status: ${transaction.status}`);
            tagSet.add(`status-${transaction.status.toLowerCase()}`);
          }
          if (transaction.providerCode) {
            metaParts.push(`Provedor: ${transaction.providerCode}`);
          }

          const notes = metaParts.length ? sanitizeNotes(metaParts.join(' | ')) : null;
          const tags = sanitizeTags(Array.from(tagSet));
          
          logger.debug('[v0] Inserting transaction:', {
            id: transaction.id,
            description: description,
            amount: txAmount,
            date: transaction.date,
            type: txType,
            accountType: dbAccount.account_type,
            originalAmount: transaction.amount,
          });
          
          await sql`
            INSERT INTO transactions (
              user_id, account_id, description, amount, transaction_date, type, open_finance_id,
              tags, notes, status, provider_code, payment_method, reference_number, mcc, bank_category
            )
            VALUES (
              ${user.id},
              ${dbAccount.id},
              ${description},
              ${txAmount},
              ${transaction.date},
              ${txType},
              ${transaction.id},
              ${tags.length ? tags : null},
              ${notes},
              ${transaction.status || null},
              ${transaction.providerCode || null},
              ${transaction.paymentData?.paymentMethod ? sanitizeDescription(transaction.paymentData.paymentMethod) : null},
              ${transaction.paymentData?.referenceNumber || null},
              ${transaction.creditCardMetadata?.mcc || null},
              ${transaction.category || null}
            )
          `;
          
          transactionsSynced++;
        } else {
          logger.debug('[v0] Transaction already exists:', transaction.id);
        }
      }
    }
  }

  // Update last sync
  await sql`
    UPDATE open_finance_connections
    SET last_sync_at = NOW()
    WHERE id = ${connectionId}
  `;

  logger.info('open_finance.sync.success', {
    userId: user.id,
    connectionId,
    accountsSynced,
    transactionsSynced,
  });

  await logAudit({
    userId: user.id,
    action: 'open_finance.sync',
    entityType: 'open_finance_connection',
    entityId: String(connectionId),
    details: {
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced,
      days,
      force,
    },
    success: true,
  });

  return { accountsSynced, transactionsSynced };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    logger.debug('open_finance.sync.request', {
      body: {
        connection_id: body?.connection_id,
        force: body?.force,
        days: body?.days,
      },
      types: {
        connection_id: typeof body?.connection_id,
        force: typeof body?.force,
        days: typeof body?.days,
      },
    });
    
    const { connection_id, force, days } = SyncSchema.parse(body);

    const { accountsSynced, transactionsSynced } = await syncConnectionInternal({
      user,
      connectionId: connection_id,
      days,
      force,
    });

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced,
    });

  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (error instanceof z.ZodError) {
      logger.warn('open_finance.sync.zod', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          details: error.errors,
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    logger.error('open_finance.sync.fatal', error);

    try {
      const user = await requireAuth();
      await logAudit({
        userId: user.id,
        action: 'open_finance.sync',
        entityType: 'open_finance_connection',
        entityId: String((error as any)?.connection_id || ''),
        success: false,
        errorMessage: error?.message || 'Failed to sync connection',
      });
    } catch (_) {
      // ignore audit failure
    }

    return NextResponse.json(
      { error: error.message || 'Failed to sync connection' },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const connection_id = searchParams.get('connection_id');

    if (!connection_id) {
      return NextResponse.json(
        { error: 'connection_id is required' },
        { status: 400 }
      );
    }

    const connections = await sql`
      SELECT 
        id,
        status,
        last_sync_at,
        created_at
      FROM open_finance_connections
      WHERE id = ${parseInt(connection_id)} AND user_id = ${user.id}
      LIMIT 1
    `;

    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(connections[0]);
  } catch (error: any) {
    logger.error('open_finance.sync.status.error', { error });
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
