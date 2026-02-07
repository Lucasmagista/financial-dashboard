import { NextRequest, NextResponse } from 'next/server';
import { createTransaction, deleteTransaction, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { TransactionSchema } from '@/lib/schemas';
import { z } from 'zod';
import { sanitizeAmount, sanitizeDate, sanitizeDescription } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(1000, Math.max(1, requestedLimit))
      : 50;
    const type = searchParams.get('type');
    const categoryId = searchParams.get('category_id');
    const accountId = searchParams.get('account_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const sanitizedSearch = search ? sanitizeDescription(search).toLowerCase() : null;

    // Build dynamic query with filters
    let transactions;
    
    if (type || categoryId || accountId || startDate || endDate || search) {
      // Complex query with filters
      transactions = await sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          a.name as account_name,
          a.currency as account_currency,
          a.bank_name as account_bank_name,
          a.bank_code as account_bank_code
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${user.id}
          ${type && type !== 'all' ? sql`AND t.type = ${type}` : sql``}
          ${categoryId && categoryId !== 'all' ? sql`AND t.category_id = ${categoryId}` : sql``}
          ${accountId && accountId !== 'all' ? sql`AND t.account_id = ${accountId}` : sql``}
          ${startDate ? sql`AND t.transaction_date >= ${startDate}` : sql``}
          ${endDate ? sql`AND t.transaction_date <= ${endDate}` : sql``}
          ${sanitizedSearch
            ? sql`AND (
                LOWER(t.description) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(COALESCE(t.notes, '')) LIKE ${`%${sanitizedSearch}%`} OR
                EXISTS (
                  SELECT 1 FROM unnest(COALESCE(t.tags, ARRAY[]::text[])) AS tag
                  WHERE LOWER(tag) LIKE ${`%${sanitizedSearch}%`}
                )
              )`
            : sql``}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Simple query without filters
      transactions = await sql`
        SELECT 
          t.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          a.name as account_name,
          a.currency as account_currency,
          a.bank_name as account_bank_name,
          a.bank_code as account_bank_code
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        LEFT JOIN accounts a ON t.account_id = a.id
        WHERE t.user_id = ${user.id}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    logger.error('Error fetching transactions', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const sanitized = {
      ...body,
      description: sanitizeDescription(body.description),
      amount: sanitizeAmount(body.amount),
      transactionDate: sanitizeDate(body.transactionDate) || new Date().toISOString(),
      userId: user.id,
    };
    
    // Validate with Zod
    const validatedData = TransactionSchema.parse(sanitized);

    const transaction = await createTransaction(
      validatedData.userId,
      validatedData.accountId,
      validatedData.amount,
      validatedData.type,
      validatedData.description,
      new Date(validatedData.transactionDate),
      validatedData.categoryId,
      validatedData.isRecurring || false
    );

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating transaction', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    await deleteTransaction(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting transaction', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
