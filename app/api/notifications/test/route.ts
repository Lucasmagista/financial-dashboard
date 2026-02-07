import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-simple';
import webpush from 'web-push';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.SMTP_FROM || 'noreply@financialdashboard.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Send test push notification
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's push subscriptions
    const result = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No push subscriptions found' },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: 'Notificação de Teste',
      body: 'Esta é uma notificação de teste do Financial Dashboard!',
      url: '/dashboard',
      tag: 'test',
    });

    const promises = result.map(async (sub) => {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };

        await webpush.sendNotification(subscription, payload);
        return { success: true, endpoint: sub.endpoint };
      } catch (error) {
        console.error('Failed to send to:', sub.endpoint, error);
        return { success: false, endpoint: sub.endpoint, error };
      }
    });

    const results = await Promise.all(promises);

    return NextResponse.json({
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Test push notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
