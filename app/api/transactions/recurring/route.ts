import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RecurringTemplateSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).default(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const templates = await sql`
      SELECT 
        rt.*,
        c.name as category_name,
        c.color as category_color,
        a.name as account_name
      FROM recurring_transaction_templates rt
      LEFT JOIN categories c ON rt.category_id = c.id
      LEFT JOIN accounts a ON rt.account_id = a.id
      WHERE rt.user_id = ${user.id}
      ORDER BY rt.next_run_date ASC
    `;

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('[v0] Error fetching recurring templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = RecurringTemplateSchema.parse(body);

    const startDate = new Date(data.startDate);
    
    const result = await sql`
      INSERT INTO recurring_transaction_templates (
        user_id, account_id, category_id, amount, type,
        description, frequency, interval, start_date, end_date,
        next_run_date, tags, notes
      )
      VALUES (
        ${user.id},
        ${data.accountId},
        ${data.categoryId || null},
        ${data.amount},
        ${data.type},
        ${data.description},
        ${data.frequency},
        ${data.interval},
        ${data.startDate},
        ${data.endDate || null},
        ${data.startDate},
        ${data.tags || null},
        ${data.notes || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ template: result[0] });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error creating recurring template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
