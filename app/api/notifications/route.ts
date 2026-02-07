import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserId } from '@/lib/auth-simple';
import { sanitizeDescription } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

// Get user notifications
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(200, Math.max(1, requestedLimit)) : 50;

    const result = unreadOnly
      ? await sql`SELECT * FROM notifications WHERE user_id = ${userId} AND read = false ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;

    // Get unread count
    const countResult = await sql`SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ${userId} AND read = false`;

    return NextResponse.json({
      notifications: result,
      unreadCount: parseInt(countResult[0]?.unread_count || '0'),
    });
  } catch (error) {
    logger.error('Get notifications error', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, markAllAsRead } = await request.json();

    if (markAllAsRead) {
      await sql`UPDATE notifications SET read = true WHERE user_id = ${userId} AND read = false`;

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const result = await sql`UPDATE notifications SET read = true WHERE id = ${notificationId} AND user_id = ${userId} RETURNING *`;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: result[0],
    });
  } catch (error) {
    logger.error('Update notification error', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      await sql`DELETE FROM notifications WHERE user_id = ${userId} AND read = true`;

      return NextResponse.json({
        success: true,
        message: 'All read notifications deleted',
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const result = await sql`DELETE FROM notifications WHERE id = ${notificationId} AND user_id = ${userId} RETURNING id`;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error('Delete notification error', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

// Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, title, message, link } = await request.json();

    const sanitizedTitle = sanitizeDescription(title).slice(0, 140);
    const sanitizedMessage = sanitizeDescription(message).slice(0, 500);
    const sanitizedLink = link ? sanitizeDescription(link).slice(0, 255) : null;

     const result = await sql`INSERT INTO notifications (user_id, type, title, message, link, read, created_at)
       VALUES (${userId}, ${type}, ${sanitizedTitle}, ${sanitizedMessage}, ${sanitizedLink}, false, NOW())
       RETURNING *`;

    return NextResponse.json({
      success: true,
      notification: result[0],
    });
  } catch (error) {
    logger.error('Create notification error', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
