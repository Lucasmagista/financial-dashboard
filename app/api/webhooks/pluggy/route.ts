// Pluggy Webhook Handler
// Receives real-time updates from Pluggy for automatic sync

import { NextRequest, NextResponse } from 'next/server';
import { syncConnection } from '@/lib/open-finance-complete';
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createHmac, timingSafeEqual } from 'crypto';

const WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-pluggy-signature');
    
    if (!signature || !WEBHOOK_SECRET) {
      logger.security('pluggy.webhook.missing_signature', {
        hasSignature: Boolean(signature),
        hasSecret: Boolean(WEBHOOK_SECRET),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.text();

    const verifySignature = (payload: string, headerSig: string, secret: string) => {
      const normalized = headerSig.replace(/^sha256=/i, '').trim();
      const expectedHex = createHmac('sha256', secret).update(payload).digest('hex');
      const expectedB64 = createHmac('sha256', secret).update(payload).digest('base64');
      const safeEqual = (a: string, b: string) => {
        const aBuf = Buffer.from(a);
        const bBuf = Buffer.from(b);
        if (aBuf.length !== bBuf.length) return false;
        return timingSafeEqual(aBuf, bBuf);
      };
      return safeEqual(normalized, expectedHex) || safeEqual(normalized, expectedB64);
    };

    if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
      logger.security('pluggy.webhook.invalid_signature', { signature: signature.slice(0, 12) + '...' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let event: { type: string; data?: any };
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      logger.warn('pluggy.webhook.parse_error', { error: parseError });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    logger.info('pluggy.webhook.received', { eventType: event.type });

    // Handle different webhook events
    switch (event.type) {
      case 'item/created':
        await handleItemCreated(event.data);
        break;

      case 'item/updated':
        await handleItemUpdated(event.data);
        break;

      case 'item/error':
        await handleItemError(event.data);
        break;

      case 'item/deleted':
        await handleItemDeleted(event.data);
        break;

      case 'item/login_succeeded':
        await handleLoginSucceeded(event.data);
        break;

      case 'item/login_failed':
        await handleLoginFailed(event.data);
        break;

      default:
        logger.warn('pluggy.webhook.unknown_event', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('pluggy.webhook.error', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleItemCreated(data: any) {
  logger.info('pluggy.webhook.item_created', { itemId: data?.id });
  
  // Get user from item
  const connection = await sql`
    SELECT user_id FROM open_finance_connections
    WHERE item_id = ${data.id}
  `;

  if (connection.length > 0) {
    const userId = connection[0].user_id;
    await syncConnection(userId, data.id);
  }
}

async function handleItemUpdated(data: any) {
  logger.info('pluggy.webhook.item_updated', { itemId: data?.id });
  
  const connection = await sql`
    SELECT user_id FROM open_finance_connections
    WHERE item_id = ${data.id}
  `;

  if (connection.length > 0) {
    const userId = connection[0].user_id;
    await syncConnection(userId, data.id);
  }
}

async function handleItemError(data: any) {
  logger.error('pluggy.webhook.item_error', {
    itemId: data?.id,
    error: data?.error,
  });
  
  await sql`
    UPDATE open_finance_connections
    SET status = 'error', error_message = ${data.error?.message || 'Unknown error'}
    WHERE item_id = ${data.id}
  `;
}

async function handleItemDeleted(data: any) {
  logger.info('pluggy.webhook.item_deleted', { itemId: data?.id });
  
  await sql`
    DELETE FROM open_finance_connections
    WHERE item_id = ${data.id}
  `;
}

async function handleLoginSucceeded(data: any) {
  logger.info('pluggy.webhook.login_succeeded', { itemId: data?.id });
  
  await sql`
    UPDATE open_finance_connections
    SET status = 'active', error_message = NULL, last_sync_at = NOW()
    WHERE item_id = ${data.id}
  `;
}

async function handleLoginFailed(data: any) {
  logger.error('pluggy.webhook.login_failed', {
    itemId: data?.id,
    error: data?.error,
  });
  
  await sql`
    UPDATE open_finance_connections
    SET status = 'error', error_message = ${data.error?.message || 'Login failed'}
    WHERE item_id = ${data.id}
  `;
}
