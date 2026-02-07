import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { logAudit } from '@/lib/audit-log';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: transactionId } = await params;
    const body = await request.json();
    const { date, count = 1 } = body;

    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Get original transaction
    const original = await sql`
      SELECT * FROM transactions
      WHERE id = ${transactionId} AND user_id = ${user.id}
    `;

    if (original.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = original[0];
    const newDate = date ? new Date(date) : new Date();
    const duplicated = [];

    // Create duplicates
    for (let i = 0; i < count; i++) {
      const result = await sql`
        INSERT INTO transactions (
          user_id, account_id, category_id, amount, type,
          description, transaction_date, is_recurring, tags, notes
        )
        VALUES (
          ${transaction.user_id},
          ${transaction.account_id},
          ${transaction.category_id},
          ${transaction.amount},
          ${transaction.type},
          ${transaction.description},
          ${newDate.toISOString()},
          ${transaction.is_recurring},
          ${transaction.tags || null},
          ${transaction.notes || null}
        )
        RETURNING *
      `;
      
      duplicated.push(result[0]);
      
      // Increment date for next duplicate if multiple
      if (count > 1) {
        newDate.setDate(newDate.getDate() + 1);
      }
    }

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'transaction.create',
      entityType: 'transaction',
      entityId: transactionId,
      details: { count, newDate: date, duplicated: true },
      success: true,
    });

    return NextResponse.json({
      success: true,
      duplicated,
    });
  } catch (error: any) {
    console.error('[v0] Error duplicating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate transaction' },
      { status: 500 }
    );
  }
}
