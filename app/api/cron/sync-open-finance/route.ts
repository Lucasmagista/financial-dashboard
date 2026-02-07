import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { syncConnectionInternal } from '@/app/api/open-finance/sync/route';

// This endpoint should be called by a cron job (Vercel Cron or external)
// Verify with CRON_SECRET environment variable
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[v0] Starting scheduled Open Finance sync...');

    // Get all active connections
    const connections = await sql`
      SELECT id, user_id, item_id
      FROM open_finance_connections
      WHERE status = 'active'
      ORDER BY last_sync_at ASC NULLS FIRST
      LIMIT 50
    `;

    console.log(`[v0] Found ${connections.length} connections to sync`);

    const results = [];
    for (const connection of connections) {
      try {
        const { accountsSynced, transactionsSynced } = await syncConnectionInternal({
          user: { id: String(connection.user_id) },
          connectionId: connection.id,
          days: 7,
          force: false,
        });
        results.push({
          connection_id: connection.id,
          status: 'success',
          accounts_synced: accountsSynced,
          transactions_synced: transactionsSynced,
        });
      } catch (error: any) {
        console.error(`[v0] Error syncing connection ${connection.id}:`, error);
        results.push({
          connection_id: connection.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log('[v0] Scheduled sync completed');

    return NextResponse.json({
      success: true,
      synced: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    });
  } catch (error: any) {
    console.error('[v0] Cron sync error:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled sync' },
      { status: 500 }
    );
  }
}
