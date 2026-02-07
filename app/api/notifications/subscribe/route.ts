import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';

export const dynamic = 'force-dynamic';

// Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    // Store subscription in database
    await sql`INSERT INTO push_subscriptions (user_id, endpoint, keys, created_at)
       VALUES (${userId}, ${subscription.endpoint}, ${JSON.stringify(subscription.keys)}, NOW())
       ON CONFLICT (endpoint) 
       DO UPDATE SET user_id = ${userId}, keys = ${JSON.stringify(subscription.keys)}, updated_at = NOW()`;

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('Subscribe to push notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    );
  }
}
