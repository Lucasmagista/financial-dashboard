import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { logAudit } from '@/lib/audit-log';
import { z } from 'zod';

const BulkUpdateSchema = z.object({
  transactionIds: z.array(z.string()).min(1).max(100),
  updates: z.object({
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const BulkDeleteSchema = z.object({
  transactionIds: z.array(z.string()).min(1).max(100),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { transactionIds, updates } = BulkUpdateSchema.parse(body);

    // Verify all transactions belong to user
    const transactions = await sql`
      SELECT id FROM transactions
      WHERE id = ANY(${transactionIds}::uuid[])
        AND user_id = ${user.id}
    `;

    if (transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: 'Some transactions not found or unauthorized' },
        { status: 403 }
      );
    }

    // Build update query
    const updateParts = [];
    if (updates.categoryId) {
      updateParts.push(`category_id = '${updates.categoryId}'`);
    }
    if (updates.tags) {
      const tagsArray = `ARRAY[${updates.tags.map(t => `'${t}'`).join(',')}]`;
      updateParts.push(`tags = ${tagsArray}`);
    }

    if (updateParts.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Execute bulk update
    await sql.unsafe(`
      UPDATE transactions
      SET ${updateParts.join(', ')}, updated_at = NOW()
      WHERE id = ANY(ARRAY[${transactionIds.map(id => `'${id}'`).join(',')}]::uuid[])
    `);

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'BULK_UPDATE_TRANSACTIONS',
      resourceType: 'transaction',
      details: { count: transactionIds.length, updates },
    });

    return NextResponse.json({
      success: true,
      updated: transactionIds.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error bulk updating:', error);
    return NextResponse.json(
      { error: 'Failed to update transactions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { transactionIds } = BulkDeleteSchema.parse(body);

    // Verify all transactions belong to user
    const transactions = await sql`
      SELECT id, receipt_url FROM transactions
      WHERE id = ANY(${transactionIds}::uuid[])
        AND user_id = ${user.id}
    `;

    if (transactions.length !== transactionIds.length) {
      return NextResponse.json(
        { error: 'Some transactions not found or unauthorized' },
        { status: 403 }
      );
    }

    // Delete receipts from Blob
    const { del } = await import('@vercel/blob');
    for (const transaction of transactions) {
      if (transaction.receipt_url) {
        try {
          await del(transaction.receipt_url);
        } catch (err) {
          console.error('[v0] Error deleting receipt:', err);
        }
      }
    }

    // Delete transactions
    await sql`
      DELETE FROM transactions
      WHERE id = ANY(${transactionIds}::uuid[])
    `;

    // Log audit
    await logAudit({
      userId: user.id,
      action: 'BULK_DELETE_TRANSACTIONS',
      resourceType: 'transaction',
      details: { count: transactionIds.length },
    });

    return NextResponse.json({
      success: true,
      deleted: transactionIds.length,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error bulk deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}
