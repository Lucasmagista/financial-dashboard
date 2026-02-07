import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

// Unsubscribe from push notifications
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    await sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}`;

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('Unsubscribe from push notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}
