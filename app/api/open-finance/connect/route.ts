import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-simple';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * API endpoint for connecting Open Finance accounts
 * 
 * This is a placeholder implementation. In production, you would:
 * 1. Integrate with an Open Finance provider (e.g., Pluggy, Belvo, Bankly)
 * 2. Handle OAuth flow for bank authorization
 * 3. Securely store access tokens
 * 4. Fetch and sync transaction data periodically
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankCode, consentId, accessToken } = body;

    if (!bankCode || !consentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store Open Finance connection
    const result = await sql`
      INSERT INTO open_finance_connections (
        user_id, 
        institution_name, 
        consent_id, 
        access_token,
        status,
        expires_at
      )
      VALUES (
        ${user.id},
        ${bankCode},
        ${consentId},
        ${accessToken || 'placeholder_token'},
        'active',
        NOW() + INTERVAL '90 days'
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      connection: result[0],
      message: 'Open Finance connection established successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('[v0] Error connecting Open Finance:', error);
    return NextResponse.json(
      { error: 'Failed to connect Open Finance account' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await sql`
      SELECT * FROM open_finance_connections
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(connections);
  } catch (error) {
    console.error('[v0] Error fetching Open Finance connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
