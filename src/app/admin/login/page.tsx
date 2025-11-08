'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Lock } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function LoginPage() {
  const themeConfig = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${themeConfig.page} flex items-center justify-center p-4`}>
      <div className="max-w-md w-full">
        <div className={`bg-white rounded-2xl shadow-xl p-8 ${themeConfig.classes.borderBeige}`}>
          <div className="text-center mb-8">
            <div className={`mx-auto w-16 h-16 ${themeConfig.icon.primary} mb-4`}>
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <h1 className={`text-2xl font-bold ${themeConfig.text.heading} mb-2`}>Admin Access</h1>
            <p className={themeConfig.text.muted}>Sign in to manage your event seating</p>
          </div>

          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${themeConfig.toast.error}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className={themeConfig.text.label}>
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={themeConfig.input}
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className={themeConfig.text.label}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={themeConfig.input}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${themeConfig.button.primary} flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 text-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className={`text-sm font-medium ${themeConfig.text.link}`}>
              ← Back to Guest Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}