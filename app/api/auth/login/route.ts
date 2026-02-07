import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/auth/[...nextauth] com NextAuth credentials' },
    { status: 405 }
  );
}
