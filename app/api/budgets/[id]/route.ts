import { NextRequest, NextResponse } from 'next/server';
import { updateBudget, deleteBudget, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

const UpdateBudgetSchema = z.object({
  name: z.string().optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
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

    const { id: budgetId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM budgets WHERE id = ${budgetId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = UpdateBudgetSchema.parse(body);

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.amount) updateData.amount = validatedData.amount;
    if (validatedData.period) updateData.period = validatedData.period;
    if (validatedData.categoryId) updateData.category_id = validatedData.categoryId;
    if (validatedData.startDate) updateData.start_date = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) updateData.end_date = validatedData.endDate ? new Date(validatedData.endDate) : null;

    const budget = await updateBudget(budgetId, updateData);

    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
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

    const { id: budgetId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM budgets WHERE id = ${budgetId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    await deleteBudget(budgetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    );
  }
}
