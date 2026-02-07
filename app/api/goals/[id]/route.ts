import { NextRequest, NextResponse } from 'next/server';
import { updateGoal, deleteGoal, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateGoalSchema = z.object({
  name: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
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

    const { id: goalId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM goals WHERE id = ${goalId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = UpdateGoalSchema.parse(body);

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.targetAmount) updateData.target_amount = validatedData.targetAmount;
    if (validatedData.currentAmount !== undefined) updateData.current_amount = validatedData.currentAmount;
    if (validatedData.targetDate !== undefined) updateData.target_date = validatedData.targetDate ? new Date(validatedData.targetDate) : null;
    if (validatedData.isCompleted !== undefined) updateData.is_completed = validatedData.isCompleted;

    const goal = await updateGoal(goalId, updateData);

    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
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

    const { id: goalId } = await params;

    // Verify ownership
    const existing = await sql`
      SELECT * FROM goals WHERE id = ${goalId} AND user_id = ${user.id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await deleteGoal(goalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
