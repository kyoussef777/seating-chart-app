'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Route-level error boundary.
 *
 * Without one, any client-side exception replaces the app with Next's opaque
 * "Application error: a client-side exception has occurred", which tells
 * neither the person using the app nor whoever has to fix it what broke. This
 * keeps the page usable, names the failure, and offers a retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-bold text-emerald-900">Something went wrong</h1>
        </div>

        <p className="mb-4 text-sm text-stone-600">
          The page hit an unexpected error. Your seating data is safe — reloading
          usually clears it.
        </p>

        <pre className="mb-4 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-stone-100 p-3 text-xs text-stone-700">
          {error.message || 'Unknown error'}
          {error.digest ? `\n\nDigest: ${error.digest}` : ''}
        </pre>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-lg border-2 border-stone-500 bg-white py-2.5 font-medium text-emerald-700 hover:bg-stone-50"
          >
            Reload page
          </button>
          <button
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-stone-600 to-stone-700 py-2.5 font-medium text-white hover:from-stone-700 hover:to-stone-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
