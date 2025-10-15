import { NextResponse } from 'next/server';
import { getCsrfToken } from '@/lib/csrf';

/**
 * GET /api/csrf
 * Returns a CSRF token for the client to use in subsequent requests
 */
export async function GET() {
  try {
    const token = await getCsrfToken();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
