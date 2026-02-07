import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth-simple';
import { getPaginationParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const page = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const { offset, limit } = getPaginationParams(page || undefined, limitParam || undefined);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Full-text search with PostgreSQL
    const results = await sql`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon,
        a.name as account_name,
        ts_rank(t.search_vector, to_tsquery('portuguese', ${query + ':*'})) as rank
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ${user.id}
        AND t.search_vector @@ to_tsquery('portuguese', ${query + ':*'})
      ORDER BY rank DESC, t.transaction_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = ${user.id}
        AND t.search_vector @@ to_tsquery('portuguese', ${query + ':*'})
    `;

    return NextResponse.json({
      transactions: results,
      total: parseInt(countResult[0].total),
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      query,
    });
  } catch (error: any) {
    console.error('[v0] Error searching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to search transactions' },
      { status: 500 }
    );
  }
}
