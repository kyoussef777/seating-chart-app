/**
 * Guest name matching for the portal's autocomplete.
 *
 * Extracted from the home page so the ranking can be tested without a browser,
 * and so every template shares one search behaviour.
 */

export interface SearchableGuest {
  name: string;
}

/** How many suggestions the portal offers before asking the guest to type more. */
export const MAX_SUGGESTIONS = 10;

/**
 * Score a guest name against a search term. Higher is a better match; 0 means
 * "not a match at all".
 */
export function scoreGuest(term: string, name: string): number {
  const needle = term.toLowerCase().trim();
  if (!needle) return 0;

  const haystack = name.toLowerCase();
  const words = needle.split(/\s+/);
  let score = 0;

  if (haystack === needle) {
    score = 1000;
  } else if (haystack.startsWith(needle)) {
    score = 500;
  } else if (haystack.includes(needle)) {
    score = 250;
  } else if (words.length > 1) {
    // "john smith" should still find "Smith, John".
    const nameWords = haystack.split(/\s+/);
    const matched = words.filter((word) =>
      nameWords.some((nameWord) => nameWord.startsWith(word) || nameWord.includes(word))
    );
    score = matched.length * 100;
  } else {
    const nameWords = haystack.split(/\s+/);
    const partial = nameWords.some((word) => word.includes(needle) || needle.includes(word));
    if (partial) score = 50;
  }

  if (score > 0 && haystack.split(/\s+/)[0].startsWith(needle)) {
    score += 50;
  }

  return score;
}

/** Best matches for `term`, strongest first, capped at {@link MAX_SUGGESTIONS}. */
export function searchGuests<T extends SearchableGuest>(term: string, guests: T[]): T[] {
  if (!term.trim()) return [];

  return guests
    .map((guest) => ({ guest, score: scoreGuest(term, guest.name) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.guest);
}
