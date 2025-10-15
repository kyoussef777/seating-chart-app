import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a CSRF token for storage in cookie
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get or create a CSRF token
 * Returns the token that should be used in forms/headers
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existingToken) {
    return existingToken;
  }

  // Generate new token
  const token = generateCsrfToken();
  const hashedToken = hashToken(token);

  // Set cookie (will be applied in the response)
  cookieStore.set(CSRF_COOKIE_NAME, hashedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token;
}

/**
 * Validate CSRF token from request
 */
export async function validateCsrfToken(requestToken: string | null): Promise<boolean> {
  if (!requestToken) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  // Hash the request token and compare with cookie
  const hashedRequestToken = hashToken(requestToken);
  return hashedRequestToken === cookieToken;
}

/**
 * Middleware helper to require CSRF token for state-changing requests
 */
export async function requireCsrfToken(headers: Headers): Promise<void> {
  const token = headers.get(CSRF_HEADER_NAME);

  const isValid = await validateCsrfToken(token);

  if (!isValid) {
    throw new Error('Invalid CSRF token');
  }
}

/**
 * Get CSRF token from request headers
 */
export function getCsrfTokenFromHeaders(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME);
}
