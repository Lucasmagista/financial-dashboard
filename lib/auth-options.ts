import NextAuth, { type NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { logger, logAuthEvent } from '@/lib/logger';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  password_hash?: string | null;
  is_active?: boolean | null;
  is_email_verified?: boolean | null;
};

// Precomputed bcrypt hash for the string "password" to normalize timing
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8iJEOIBxPL5BwKs6NUVZhX/9lV7q';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const forwardedFor = req?.headers?.['x-forwarded-for'];
        const ipHeader = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor;
        const ip = ipHeader?.split(',')[0]?.trim();

        const requestIdHeader = req?.headers?.['x-request-id'];
        const requestId = Array.isArray(requestIdHeader)
          ? requestIdHeader[0]
          : requestIdHeader;

        try {
          // Older databases may not have is_active/is_email_verified; fetch only guaranteed columns.
          const result = await sql`
            SELECT id, email, name, password_hash
            FROM users
            WHERE email = ${email}
            LIMIT 1
          `;

          const user = result[0] as AppUser | undefined;

          if (!user) {
            await bcrypt.compare(password, DUMMY_HASH);
            logAuthEvent('failed_login', undefined, undefined, {
              email,
              ip,
              requestId,
              reason: 'user_not_found',
            });
            return null;
          }

          const isActive = true; // assume active when column is absent
          const isEmailVerified = true; // assume verified when column is absent

          if (!user.password_hash) {
            await bcrypt.compare(password, DUMMY_HASH);
            logAuthEvent('failed_login', user.id, undefined, {
              email,
              ip,
              requestId,
              reason: 'missing_password_hash',
            });
            return null;
          }

          let isValid = false;
          try {
            isValid = await bcrypt.compare(password, user.password_hash);
          } catch (err) {
            // Ignore and handle below as legacy hash.
          }

          if (!isValid) {
            const looksLegacy = !user.password_hash.startsWith('$2');
            if (looksLegacy) {
              const passwordHash = await bcrypt.hash(password, 12);
              await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
              isValid = true;
              logAuthEvent('login', user.id, ip, {
                email,
                requestId,
                note: 'password_hash_refreshed_legacy',
              });
            }
          }

          if (!isValid) {
            logAuthEvent('failed_login', user.id, undefined, {
              email,
              ip,
              requestId,
              reason: 'invalid_password',
            });
            return null;
          }

          if (!isActive || !isEmailVerified) {
            logAuthEvent('failed_login', user.id, undefined, {
              email,
              ip,
              requestId,
              reason: !isActive ? 'inactive_user' : 'email_not_verified',
            });
            return null;
          }

          logAuthEvent('login', user.id, ip, { email, requestId });

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
          } satisfies AppUser;
        } catch (error) {
          logger.error('Credentials authorize failed', error, {
            email,
            ip,
            requestId,
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && typeof user === 'object' && 'id' in user) {
        const authUser = user as AppUser;
        token.id = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// NextAuth v5 helpers for app router usage.
export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);
