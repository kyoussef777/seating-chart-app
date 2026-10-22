/**
 * Sizing for the guest portal's display type: the event name and the table
 * name. Both are free text typed by an admin, so the portal cannot assume they
 * are short — "Mira & Kamal" and "Alexandrina Montgomery-Fitzgerald &
 * Bartholomew Christopherson" have to sit in the same card on a 320px phone.
 *
 * The approach: work out how long the longest line will be once the text is
 * wrapped into a few balanced lines, then size the type so that line fills the
 * card. The width itself is left to CSS (`cqi`, the card's own width), so the
 * maths here only has to answer "how many characters wide".
 *
 * Pure and DOM-free so it is unit tested and shared by every template.
 */

/** Words as the browser would break them: on whitespace only. */
function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** How many lines a greedy wrap at `width` characters takes. */
function linesAt(lengths: number[], width: number): number {
  let lines = 1;
  let current = -1;
  for (const length of lengths) {
    const next = current < 0 ? length : current + 1 + length;
    if (next > width && current >= 0) {
      lines += 1;
      current = length;
    } else {
      current = next;
    }
  }
  return lines;
}

/**
 * The length, in characters, of the longest line when `text` is wrapped into at
 * most `maxLines` lines as evenly as possible. A single word longer than that
 * is its own floor: it cannot be made shorter by wrapping.
 */
export function longestBalancedLine(text: string, maxLines: number): number {
  const lengths = words(text).map((w) => w.length);
  if (lengths.length === 0) return 0;

  const total = lengths.reduce((sum, l) => sum + l, 0) + lengths.length - 1;
  let low = Math.max(...lengths);
  let high = total;
  const lines = Math.max(1, Math.floor(maxLines));

  // The narrowest width whose greedy wrap still fits in `lines` lines.
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (linesAt(lengths, mid) <= lines) high = mid;
    else low = mid + 1;
  }
  return low;
}

export interface Couple {
  first: string;
  /** The joining word as typed: "&", "+" or "and" (in any case). */
  joiner: string;
  second: string;
}

/**
 * Split a couple's names on their joining word — "Mira & Kamal", "Ann and Bob",
 * "Ann + Bob" — so a template can set the joiner on a line of its own.
 * Returns null for anything that is not exactly two names joined once, which
 * is then set as ordinary wrapped text.
 */
export function splitCouple(name: string): Couple | null {
  const parts = name.trim().split(/\s+(&|\+|and)\s+/i);
  if (parts.length !== 3) return null;
  const [first, joiner, second] = parts.map((p) => p.trim());
  return first && second ? { first, joiner, second } : null;
}

export interface FitOptions {
  /** Most lines the text may wrap to before the type shrinks instead. */
  maxLines: number;
  /** Average advance width of one character, in ems, including tracking. */
  charEm: number;
  /** Largest size, in px — short text stops growing here. */
  maxPx: number;
  /** Smallest size, in px — below this a long word breaks instead. */
  minPx: number;
}

/**
 * A CSS `font-size` for `text` that fits its container's width. Must be used
 * inside an element with `container-type: inline-size`, which is what `cqi`
 * measures.
 */
export function fitFontSize(text: string | string[], options: FitOptions): string {
  const pieces = Array.isArray(text) ? text : [text];
  const chars = Math.max(1, ...pieces.map((p) => longestBalancedLine(p, options.maxLines)));
  // Rounded so the style string is stable between server and client renders.
  const ems = Math.round(chars * options.charEm * 100) / 100;
  return `clamp(${options.minPx}px, calc(100cqi / ${ems}), ${options.maxPx}px)`;
}
