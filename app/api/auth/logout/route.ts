import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const store = await cookies();
  store.delete('session_token');
  store.delete('next-auth.session-token');
  store.delete('__Secure-next-auth.session-token');
  return NextResponse.json({ success: true });
}
