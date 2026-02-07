import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RateLimitTier } from '@/lib/rate-limit';

const PUBLIC_PATHS = [
  '/auth',
  '/welcome',
  '/api/auth',
  '/api/health',
  '/api/public',
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/webhooks')
  ) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith('/api');
  const sessionToken = req.cookies.get('session_token')?.value;
  const isAuthRoute = pathname.startsWith('/api/auth') || pathname.startsWith('/auth');
  const isWriteRoute =
    req.method !== 'GET' && req.method !== 'HEAD';

  // Rate limit API routes (best-effort; falls back to memory if Redis not set)
  if (isApiRoute) {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const identifier = sessionToken || forwarded || 'anonymous';
    const tier = isAuthRoute
      ? RateLimitTier.AUTH
      : isWriteRoute
        ? RateLimitTier.WRITE
        : RateLimitTier.API;
    const allowed = await checkRateLimit(identifier, tier);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }

  // Auth guard for app and protected API routes
  if (!isPublicPath(pathname)) {
    if (!sessionToken) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.next();
  // Basic security headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // CSP (allow self and https images; adjust if you add more origins)
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' https://logodownload.org https://upload.wikimedia.org https://cdn.segment.com data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.pluggy.ai https://cdn.pluggy.ai https://cdn.segment.com https://api.segment.io https://o484658.ingest.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://connect.pluggy.ai https://api.segment.io https://cdn.segment.com https://o484658.ingest.sentry.io https:",
      "font-src 'self' data:",
      "frame-src 'self' https://connect.pluggy.ai",
      "frame-ancestors 'self'",
    ].join('; ')
  );

  // CORS: restrict to same-origin by default
  const origin = req.headers.get('origin');
  if (origin && origin.includes(req.nextUrl.host)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Vary', 'Origin');

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
