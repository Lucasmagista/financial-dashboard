import { NextRequest, NextResponse } from 'next/server';
import { createGoal, getGoalsByUserId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { GoalSchema } from '@/lib/schemas';
import { z } from 'zod';
import { sanitizeAmount, sanitizeDescription, sanitizeDate } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await getGoalsByUserId(user.id);

    return NextResponse.json({ goals });
  } catch (error) {
    logger.error('Error fetching goals', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
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
      userId: user.id,
      name: sanitizeDescription(body.name).slice(0, 120),
      targetAmount: sanitizeAmount(body.targetAmount),
      currentAmount: sanitizeAmount(body.currentAmount || 0),
      targetDate: body.targetDate ? sanitizeDate(body.targetDate) : null,
    };
    
    // Validate with Zod
    const validatedData = GoalSchema.parse(sanitized);

    const goal = await createGoal(
      validatedData.userId,
      validatedData.name,
      validatedData.targetAmount,
      validatedData.currentAmount || 0,
      validatedData.targetDate ? new Date(validatedData.targetDate) : undefined
    );

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating goal', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
