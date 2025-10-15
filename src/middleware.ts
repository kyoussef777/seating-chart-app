import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp, RATE_LIMITS } from './lib/rate-limit';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Determine which rate limit to apply based on the path
  let rateLimitConfig;
  const rateLimitKey = getClientIp(request.headers);

  // Authentication endpoints - strictest limits
  if (pathname.startsWith('/api/auth/login')) {
    rateLimitConfig = RATE_LIMITS.auth;
    // Use username if provided in body for more accurate tracking
    // For now, use IP-based rate limiting
  }
  // CSV import endpoints - very strict
  else if (pathname.includes('/import')) {
    rateLimitConfig = RATE_LIMITS.import;
  }
  // Other API endpoints - moderate limits
  else if (pathname.startsWith('/api/')) {
    rateLimitConfig = RATE_LIMITS.api;
  }
  // Skip rate limiting for non-API routes
  else {
    return NextResponse.next();
  }

  // Apply rate limiting
  const result = checkRateLimit(rateLimitKey, rateLimitConfig);

  // Add rate limit headers to response
  const response = result.success
    ? NextResponse.next()
    : NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please try again later',
        },
        { status: 429 }
      );

  // Add standard rate limit headers
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());

  if (!result.success) {
    response.headers.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000).toString());
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
