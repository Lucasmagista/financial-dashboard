import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { sql } from '@/lib/db';
import { getAccounts, getTransactions } from '@/lib/open-finance';
import { z } from 'zod';
import { sanitizeDescription, sanitizeNotes, sanitizeTags } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

const SaveConnectionSchema = z.object({
  itemId: z.string(),
  institutionId: z.string(),
  institutionName: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const validatedData = SaveConnectionSchema.parse({
      itemId: sanitizeDescription(body.itemId),
      institutionId: sanitizeDescription(body.institutionId),
      institutionName: sanitizeDescription(body.institutionName).slice(0, 120),
    });

    // Save connection to database
    const connection = await sql`
      INSERT INTO open_finance_connections (
        user_id, provider, institution_name, institution_id, item_id, status
      )
      VALUES (
        ${user.id}, 
        'pluggy', 
        ${validatedData.institutionName}, 
        ${validatedData.institutionId}, 
        ${validatedData.itemId}, 
        'active'
      )
      RETURNING *
    `;

    // Fetch accounts from Pluggy
    try {
      const pluggyAccounts = await getAccounts(validatedData.itemId);

      // Save accounts to database
      for (const account of pluggyAccounts) {
        await sql`
          INSERT INTO accounts (
            user_id, name, account_type, balance, currency, 
            bank_name, open_finance_id, open_finance_provider, is_active
          )
          VALUES (
            ${user.id},
            ${account.name},
            ${account.type === 'BANK' ? 'checking' : account.type === 'CREDIT' ? 'credit_card' : 'other'},
            ${account.balance},
            ${account.currencyCode},
            ${validatedData.institutionName},
            ${account.id},
            'pluggy',
            true
          )
        `;

        // Fetch recent transactions (last 90 days)
        try {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 90);
          
          const transactions = await getTransactions(
            account.id,
            fromDate.toISOString().split('T')[0]
          );

          // Save transactions (limit to most recent 500 per account)
          const recentTransactions = transactions.slice(0, 500);
          
          for (const transaction of recentTransactions) {
            // Get account ID from database
            const accountResult = await sql`
              SELECT id FROM accounts 
              WHERE open_finance_id = ${account.id} AND user_id = ${user.id}
              LIMIT 1
            `;

              if (accountResult.length > 0) {
                const txType = transaction.amount < 0 ? 'expense' : 'income';
                let description = sanitizeDescription(transaction.description || transaction.descriptionRaw || 'Transação');
                const tagSet = new Set<string>();
                const metaParts: string[] = [];

                if (transaction.paymentData) {
                  const method = transaction.paymentData.paymentMethod?.toUpperCase();
                  if (method) {
                    tagSet.add(method.toLowerCase());
                    metaParts.push(`Método: ${method}`);
                  }
                  if (method?.includes('PIX')) {
                    tagSet.add('pix');
                  }
                  if (transaction.paymentData.referenceNumber) {
                    metaParts.push(`Ref: ${transaction.paymentData.referenceNumber}`);
                  }
                }

                if (transaction.creditCardMetadata) {
                  const meta = transaction.creditCardMetadata;
                  if (meta.totalInstallments && meta.totalInstallments > 1) {
                    description += ` (${meta.instalmentNumber}/${meta.totalInstallments})`;
                    metaParts.push(`Parcelas: ${meta.instalmentNumber}/${meta.totalInstallments}`);
                    tagSet.add('parcelado');
                  }
                  if (meta.payeeName) {
                    description = `${sanitizeDescription(meta.payeeName)} - ${description}`;
                  }
                }

                if (transaction.category) {
                  metaParts.push(`Categoria banco: ${transaction.category}`);
                }
                if (transaction.status) {
                  metaParts.push(`Status: ${transaction.status}`);
                  tagSet.add(`status-${transaction.status.toLowerCase()}`);
                }

                const notes = metaParts.length ? sanitizeNotes(metaParts.join(' | ')) : null;
                const tags = sanitizeTags(Array.from(tagSet));

                await sql`
                  INSERT INTO transactions (
                    user_id, account_id, amount, type, description, 
                    transaction_date, open_finance_id, tags, notes
                  )
                  VALUES (
                    ${user.id},
                    ${accountResult[0].id},
                    ${Math.abs(transaction.amount)},
                    ${txType},
                    ${description},
                    ${transaction.date},
                    ${transaction.id},
                    ${tags.length ? tags : null},
                    ${notes}
                  )
                  ON CONFLICT (open_finance_id) DO NOTHING
                `;
              }
          }
        } catch (txError) {
          logger.error('Error fetching transactions from Pluggy', txError);
          // Continue even if transactions fail
        }
      }

      // Update last sync
      await sql`
        UPDATE open_finance_connections
        SET last_sync_at = NOW()
        WHERE id = ${connection[0].id}
      `;
    } catch (accountError) {
      logger.error('Error fetching accounts from Pluggy', accountError);
      // Mark connection with error but don't fail
      await sql`
        UPDATE open_finance_connections
        SET status = 'error', error_message = ${String(accountError)}
        WHERE id = ${connection[0].id}
      `;
    }

    return NextResponse.json({
      success: true,
      connection: connection[0],
    });
  } catch (error: any) {
    logger.error('Error saving open finance connection', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao salvar conexão' },
      { status: 500 }
    );
  }
}
