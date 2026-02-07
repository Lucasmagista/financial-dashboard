import { NextRequest, NextResponse } from 'next/server';
import { createBudget, getBudgetsByUserId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { BudgetSchema } from '@/lib/schemas';
import { z } from 'zod';
import { sanitizeAmount, sanitizeDescription, sanitizeDate } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budgets = await getBudgetsByUserId(user.id);

    return NextResponse.json({ budgets });
  } catch (error) {
    logger.error('Error fetching budgets', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
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
      amount: sanitizeAmount(body.amount),
      startDate: sanitizeDate(body.startDate) || new Date().toISOString(),
      endDate: body.endDate ? sanitizeDate(body.endDate) : null,
    };
    
    // Validate with Zod
    const validatedData = BudgetSchema.parse(sanitized);

    const budget = await createBudget(
      validatedData.userId,
      validatedData.categoryId,
      validatedData.name,
      validatedData.amount,
      validatedData.period,
      new Date(validatedData.startDate),
      validatedData.endDate ? new Date(validatedData.endDate) : undefined
    );

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating budget', error);
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    );
  }
}
