import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { auth } from './auth-options';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  is_email_verified?: boolean;
  preferences?: any;
  created_at?: Date;
}

async function getSession() {
  return auth();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const result = await sql`
    SELECT id, email, name, phone, avatar_url, is_email_verified, preferences, created_at
    FROM users
    WHERE id = ${session.user.id}
    LIMIT 1
  `;

  if (result.length === 0) return null;

  return result[0] as AuthUser;
}

export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: AuthUser }> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await sql`
    SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
  `;

  if (existing.length > 0) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${normalizedEmail}, ${passwordHash}, ${name})
    RETURNING id, email, name
  `;

  const user = result[0] as AuthUser;
  return { user };
}

// Stub kept for backward compatibility; prefer NextAuth signIn.
export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await sql`
    SELECT * FROM users WHERE email = ${normalizedEmail} LIMIT 1
  `;
  if (result.length === 0) {
    throw new Error('Invalid email or password');
  }
  const user = result[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    } as AuthUser,
    sessionToken: null,
  };
}

export async function logout(): Promise<void> {
  // Client should call next-auth signOut; server-side we simply clear legacy cookie.
  const store = await import('next/headers').then((m) => m.cookies());
  store.delete('session_token');
}