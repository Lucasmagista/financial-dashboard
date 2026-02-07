import { NextRequest, NextResponse } from 'next/server';
import { updateGoalProgress, sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ProgressSchema = z.object({
  currentAmount: z.number().min(0),
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
    const validatedData = ProgressSchema.parse(body);

    const goal = await updateGoalProgress(goalId, validatedData.currentAmount);

    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error updating goal progress:', error);
    return NextResponse.json(
      { error: 'Failed to update goal progress' },
      { status: 500 }
    );
  }
}
