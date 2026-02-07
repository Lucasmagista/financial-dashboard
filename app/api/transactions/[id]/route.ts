import { NextRequest, NextResponse } from 'next/server';
import { updateTransaction, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

const UpdateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  description: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transactionId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM transactions WHERE id = ${transactionId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = UpdateTransactionSchema.parse(body);

    const updateData: any = {};
    if (validatedData.accountId) updateData.account_id = validatedData.accountId;
    if (validatedData.categoryId !== undefined) updateData.category_id = validatedData.categoryId;
    if (validatedData.amount) updateData.amount = validatedData.amount;
    if (validatedData.type) updateData.type = validatedData.type;
    if (validatedData.description) updateData.description = validatedData.description;
    if (validatedData.transactionDate) updateData.transaction_date = new Date(validatedData.transactionDate);
    if (validatedData.isRecurring !== undefined) updateData.is_recurring = validatedData.isRecurring;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;

    const transaction = await updateTransaction(transactionId, updateData);

    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
