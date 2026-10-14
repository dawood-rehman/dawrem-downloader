import { NextRequest, NextResponse } from 'next/server';
import { APP_CONFIG } from './lib/config';

// In-memory rate limiting map for edge/node proxying
const ipRateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_TRACKED_CLIENTS = 10_000;

/**
 * Modern Proxy Router & Security Gateway for Next.js 16+.
 * Handles reverse proxy routing, security headers, and rate limiting.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Static and internal Next.js assets passthrough
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt')
  ) {
    return NextResponse.next();
  }

  // 2. IP Rate limiting on initiation API routes (exempt progress polling & file downloads)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/download/progress') &&
    !pathname.startsWith('/api/download/file')
  ) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous-client';

    const now = Date.now();
    const windowRecord = ipRateLimitMap.get(ip);

    // Bound memory if this process receives requests from many unique addresses.
    if (!windowRecord && ipRateLimitMap.size >= MAX_TRACKED_CLIENTS) {
      for (const [trackedIp, record] of ipRateLimitMap) {
        if (record.expiresAt <= now) ipRateLimitMap.delete(trackedIp);
      }
      while (ipRateLimitMap.size >= MAX_TRACKED_CLIENTS) {
        const oldestIp = ipRateLimitMap.keys().next().value;
        if (oldestIp === undefined) break;
        ipRateLimitMap.delete(oldestIp);
      }
    }

    if (!windowRecord || windowRecord.expiresAt < now) {
      ipRateLimitMap.set(ip, { count: 1, expiresAt: now + 60 * 1000 });
    } else {
      windowRecord.count += 1;
      if (windowRecord.count > APP_CONFIG.rateLimitPerMinute) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please wait a minute before making more requests.',
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
            },
          }
        );
      }
    }
  }

  // 3. Security Headers dispatch
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  );

  return response;
}

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
