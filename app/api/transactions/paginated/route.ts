import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-simple';
import { paginate } from '@/lib/pagination';
import { getCachedTransactions, invalidateTransactionsCache } from '@/lib/db-cached';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Validate query params
    const query = QuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      category_id: searchParams.get('category_id'),
      account_id: searchParams.get('account_id'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
      search: searchParams.get('search'),
    });

    // Get paginated transactions with cache
    const result = await getCachedTransactions(
      user.id,
      query.page,
      query.limit
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[v0] Error fetching paginated transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
