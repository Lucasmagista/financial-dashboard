import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

interface FilterParams {
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: 'income' | 'expense';
  categoryIds?: string[];
  accountIds?: string[];
  tags?: string[];
  hasReceipt?: boolean;
  hasNotes?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      minAmount,
      maxAmount,
      type,
      categoryIds,
      accountIds,
      hasNotes,
    }: FilterParams = body;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get transactions with dynamic filters using sql tagged template
    const transactions = await sql`
      SELECT 
        t.id,
        t.description,
        t.amount,
        t.type,
        t.transaction_date as date,
        t.category_id,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        t.account_id,
        a.name as account_name,
        t.notes,
        t.tags,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ${userId}
        ${startDate ? sql`AND t.transaction_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.transaction_date <= ${endDate}` : sql``}
        ${minAmount !== undefined ? sql`AND t.amount >= ${minAmount}` : sql``}
        ${maxAmount !== undefined ? sql`AND t.amount <= ${maxAmount}` : sql``}
        ${type ? sql`AND t.type = ${type}` : sql``}
        ${categoryIds && categoryIds.length > 0 ? sql`AND t.category_id = ANY(${categoryIds}::uuid[])` : sql``}
        ${accountIds && accountIds.length > 0 ? sql`AND t.account_id = ANY(${accountIds}::uuid[])` : sql``}
        ${hasNotes === true ? sql`AND t.notes IS NOT NULL AND t.notes != ''` : sql``}
        ${hasNotes === false ? sql`AND (t.notes IS NULL OR t.notes = '')` : sql``}
      ORDER BY t.transaction_date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = ${userId}
        ${startDate ? sql`AND t.transaction_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.transaction_date <= ${endDate}` : sql``}
        ${minAmount !== undefined ? sql`AND t.amount >= ${minAmount}` : sql``}
        ${maxAmount !== undefined ? sql`AND t.amount <= ${maxAmount}` : sql``}
        ${type ? sql`AND t.type = ${type}` : sql``}
        ${categoryIds && categoryIds.length > 0 ? sql`AND t.category_id = ANY(${categoryIds}::uuid[])` : sql``}
        ${accountIds && accountIds.length > 0 ? sql`AND t.account_id = ANY(${accountIds}::uuid[])` : sql``}
        ${hasNotes === true ? sql`AND t.notes IS NOT NULL AND t.notes != ''` : sql``}
        ${hasNotes === false ? sql`AND (t.notes IS NULL OR t.notes = '')` : sql``}
    `;

    const total = parseInt(countResult[0]?.total || '0');

    // Calculate aggregate stats for filtered results
    const statsResult = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
        COUNT(*) as count
      FROM transactions t
      WHERE t.user_id = ${userId}
        ${startDate ? sql`AND t.transaction_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND t.transaction_date <= ${endDate}` : sql``}
        ${minAmount !== undefined ? sql`AND t.amount >= ${minAmount}` : sql``}
        ${maxAmount !== undefined ? sql`AND t.amount <= ${maxAmount}` : sql``}
        ${type ? sql`AND t.type = ${type}` : sql``}
        ${categoryIds && categoryIds.length > 0 ? sql`AND t.category_id = ANY(${categoryIds}::uuid[])` : sql``}
        ${accountIds && accountIds.length > 0 ? sql`AND t.account_id = ANY(${accountIds}::uuid[])` : sql``}
        ${hasNotes === true ? sql`AND t.notes IS NOT NULL AND t.notes != ''` : sql``}
        ${hasNotes === false ? sql`AND (t.notes IS NULL OR t.notes = '')` : sql``}
    `;

    const stats = statsResult[0] || { total_income: 0, total_expense: 0, count: 0 };

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
      stats: {
        totalIncome: parseFloat(stats.total_income || '0'),
        totalExpense: parseFloat(stats.total_expense || '0'),
        balance: parseFloat(stats.total_income || '0') - parseFloat(stats.total_expense || '0'),
        count: parseInt(stats.count || '0'),
      },
    });
  } catch (error) {
    console.error('Advanced filter error:', error);
    return NextResponse.json(
      { error: 'Failed to filter transactions' },
      { status: 500 }
    );
  }
}
