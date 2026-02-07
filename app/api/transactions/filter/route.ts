import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { getPaginationParams } from '@/lib/pagination';
import { z } from 'zod';

const FilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  categoryIds: z.array(z.string()).optional(),
  accountIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  hasReceipt: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const filters = FilterSchema.parse(body);
    
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const { offset, limit } = getPaginationParams(page || undefined, limitParam || undefined);

    // Build dynamic query
    let conditions = [`t.user_id = '${user.id}'`];
    
    if (filters.startDate) {
      conditions.push(`t.transaction_date >= '${filters.startDate}'`);
    }
    if (filters.endDate) {
      conditions.push(`t.transaction_date <= '${filters.endDate}'`);
    }
    if (filters.type) {
      conditions.push(`t.type = '${filters.type}'`);
    }
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      const ids = filters.categoryIds.map(id => `'${id}'`).join(',');
      conditions.push(`t.category_id IN (${ids})`);
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      const ids = filters.accountIds.map(id => `'${id}'`).join(',');
      conditions.push(`t.account_id IN (${ids})`);
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagsArray = `ARRAY[${filters.tags.map(t => `'${t}'`).join(',')}]`;
      conditions.push(`t.tags && ${tagsArray}`);
    }
    if (filters.minAmount !== undefined) {
      conditions.push(`t.amount >= ${filters.minAmount}`);
    }
    if (filters.maxAmount !== undefined) {
      conditions.push(`t.amount <= ${filters.maxAmount}`);
    }
    if (filters.hasReceipt !== undefined) {
      conditions.push(filters.hasReceipt ? 
        `t.receipt_url IS NOT NULL` : 
        `t.receipt_url IS NULL`
      );
    }
    if (filters.isRecurring !== undefined) {
      conditions.push(`t.is_recurring = ${filters.isRecurring}`);
    }

    const whereClause = conditions.join(' AND ');

    // Execute query
    const results = await sql.unsafe(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total
    const countResult = await sql.unsafe(`
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE ${whereClause}
    `) as unknown as any[];

    return NextResponse.json({
      transactions: results,
      total: parseInt(countResult[0]?.total || '0'),
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      filters,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid filters', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[v0] Error filtering transactions:', error);
    return NextResponse.json(
      { error: 'Failed to filter transactions' },
      { status: 500 }
    );
  }
}
