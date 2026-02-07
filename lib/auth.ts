import { cookies } from 'next/headers';
import { getUserByEmail } from './db';

// Simple session management
export async function createSession(userId: string) {
  const sessionData = {
    userId,
    createdAt: Date.now()
  };
  
  (await cookies()).set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function getSession() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie) return null;
  
  try {
    const session = JSON.parse(sessionCookie.value);
    return session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete('session');
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  
  // In a real app, you'd fetch the user from DB
  // For now, we'll use the demo user UUID from database
  return {
    id: session.userId || '00000000-0000-0000-0000-000000000001',
    email: 'demo@financeiro.com',
    name: 'Usuário Demo'
  };
}

// Helper to get just the user ID
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
