import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Rate limiting for this route lives in middleware.ts (RATE_LIMITS.auth).

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Input validation
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Sanitize username
    const sanitizedUsername = username.trim().slice(0, 50);

    const user = await authenticateUser(sanitizedUsername, password);
    if (!user) {
      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createToken({ userId: user.id, username: user.username });

    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}