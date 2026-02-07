import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await sql`
      SELECT id, email, name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return NextResponse.json({
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        created_at: u.created_at
      }))
    });
  } catch (error: any) {
    console.error('[v0] Error listing users:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
