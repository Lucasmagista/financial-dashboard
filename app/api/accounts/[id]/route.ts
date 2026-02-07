import { NextRequest, NextResponse } from 'next/server';
import { updateAccount, deleteAccount, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateAccountSchema = z.object({
  name: z.string().optional(),
  accountType: z.enum(['checking', 'savings', 'investment', 'credit_card', 'other']).optional(),
  balance: z.number().optional(),
  currency: z.string().length(3).optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional(),
  color: z.string().optional(),
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

    const { id: accountId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM accounts WHERE id = ${accountId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('[PATCH Account] Received body:', body);
    const validatedData = UpdateAccountSchema.parse(body);
    console.log('[PATCH Account] Validated data:', validatedData);

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.accountType) updateData.account_type = validatedData.accountType;
    if (validatedData.balance !== undefined) updateData.balance = validatedData.balance;
    if (validatedData.currency) updateData.currency = validatedData.currency;
    if (validatedData.bankName !== undefined) updateData.bank_name = validatedData.bankName;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;

    const account = await updateAccount(accountId, updateData);

    return NextResponse.json(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: accountId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM accounts WHERE id = ${accountId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await deleteAccount(accountId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
