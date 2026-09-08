'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Always reports `false` on the server and for the first client render so
 * markup matches between the two; the real value lands in the effect right
 * after hydration. Components therefore treat `false` as "assume desktop /
 * fine pointer" and progressively enhance from there.
 *
 * Safari before 14 (iOS 13 and older, and some older Android WebViews) gives
 * MediaQueryList the deprecated addListener/removeListener pair and no
 * addEventListener, so subscribing the modern way threw there and took the
 * whole admin down with it. Both APIs are handled, and anything unexpected
 * leaves the value at its last reading rather than throwing: a media query is
 * never important enough to break the page.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    let list: MediaQueryList;
    try {
      list = window.matchMedia(query);
    } catch {
      return;
    }

    const update = () => setMatches(list.matches);
    update();

    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', update);
      return () => list.removeEventListener('change', update);
    }

    if (typeof list.addListener === 'function') {
      list.addListener(update);
      return () => list.removeListener(update);
    }

    // No way to subscribe: the reading above still stands for this mount.
    return;
  }, [query]);

  return matches;
}

/** Phone-sized viewport (below Tailwind's `md` breakpoint). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Touch-first input. HTML5 drag-and-drop does not fire for touch, so views
 * that rely on dragging use this to offer an equivalent tap-based flow.
 */
export function useIsTouch(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
