import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-real';
import { sql } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DisconnectSchema = z.object({
  // Accept numeric id or item_id string from client
  connection_id: z.union([
    z.coerce.number().int().positive(),
    z.string().min(1),
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const { connection_id } = DisconnectSchema.parse(body);

    // Accept either numeric id or Pluggy item_id
    const connection = typeof connection_id === 'number'
      ? await sql`
          SELECT * FROM open_finance_connections
          WHERE id = ${connection_id} AND user_id = ${user.id}
          LIMIT 1
        `
      : await sql`
          SELECT * FROM open_finance_connections
          WHERE (item_id = ${connection_id} OR id::text = ${connection_id})
            AND user_id = ${user.id}
          LIMIT 1
        `;

    if (connection.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Deactivate connection
    await sql`
      UPDATE open_finance_connections
      SET status = 'inactive', updated_at = NOW()
      WHERE id = ${connection[0].id} AND user_id = ${user.id}
    `;

    // Deactivate linked accounts
    await sql`
      UPDATE accounts
      SET is_active = false, updated_at = NOW()
      WHERE user_id = ${user.id} 
        AND open_finance_provider = 'pluggy'
        AND bank_name = ${connection[0].institution_name}
    `;

    logger.info('open_finance.disconnect', {
      userId: user.id,
      connectionId: connection_id,
      institution: connection[0].institution_name,
    });

    return NextResponse.json({
      success: true,
      message: 'Connection disconnected successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('open_finance.disconnect.invalid_payload', {
        issues: error.issues,
        body: await safeJson(request),
      });
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[v0] Error disconnecting Open Finance:', error);
    logger.error('open_finance.disconnect.error', { error });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

async function safeJson(req: NextRequest) {
  try {
    return await req.clone().json();
  } catch {
    return null;
  }
}
