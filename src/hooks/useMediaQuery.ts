'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Always reports `false` on the server and for the first client render so
 * markup matches between the two; the real value lands in the effect right
 * after hydration. Components therefore treat `false` as "assume desktop /
 * fine pointer" and progressively enhance from there.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);

    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
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
