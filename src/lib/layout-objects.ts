/**
 * The floor plan's decoration layer: labels, shapes and reference objects.
 *
 * Shared by the admin canvas and the three `/api/layout/*` routes so the two
 * cannot disagree about what a label or a shape is allowed to contain. The
 * routes previously inserted whatever arrived, which meant a malformed client
 * payload became a malformed row.
 *
 * Deliberately free of React so route handlers can import it; the icon and
 * Tailwind class each object type renders with live beside the canvas
 * component instead.
 */

export const LABEL_BACKGROUNDS = ['none', 'light', 'solid'] as const;
export type LabelBackground = (typeof LABEL_BACKGROUNDS)[number];

export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

export const SHAPE_TYPES = ['rectangle', 'circle', 'line'] as const;
export type ShapeType = (typeof SHAPE_TYPES)[number];

export const BORDER_STYLES = ['solid', 'dashed', 'none'] as const;
export type BorderStyle = (typeof BORDER_STYLES)[number];

export const REFERENCE_OBJECT_TYPES = [
  'danceFloor',
  'bar',
  'buffet',
  'cake',
  'gift',
  'entrance',
  'stage',
] as const;
export type ReferenceObjectType = (typeof REFERENCE_OBJECT_TYPES)[number];

export const LABEL_FONT_MIN = 10;
export const LABEL_FONT_MAX = 96;

export const OBJECT_MIN_SIZE = 20;
export const OBJECT_MAX_SIZE = 4000;

export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
  background: LabelBackground;
  bold: boolean;
  align: TextAlignment;
}

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  opacity: number;
  borderColor: string;
  borderStyle: BorderStyle;
  label: string | null;
}

export interface ReferenceObject {
  id: string;
  type: ReferenceObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** Null keeps the type's stock caption. */
  label: string | null;
  /** Null keeps the type's stock colour. */
  color: string | null;
}

/** Palette offered for label ink, shape fills and object tints. */
export const PALETTE: Array<{ id: string; label: string; hex: string }> = [
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'forest', label: 'Forest', hex: '#064e3b' },
  { id: 'slate', label: 'Slate', hex: '#475569' },
  { id: 'ink', label: 'Ink', hex: '#1c1917' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'amber', label: 'Amber', hex: '#d97706' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'sky', label: 'Sky', hex: '#0284c7' },
];

/** Tints a reference object can be recoloured with, keyed the way the column
 *  stores them. */
export const REFERENCE_OBJECT_COLORS: Record<string, { label: string; bg: string; border: string; text: string }> = {
  purple: { label: 'Purple', bg: '#f3e8ff', border: '#c084fc', text: '#581c87' },
  blue: { label: 'Blue', bg: '#dbeafe', border: '#60a5fa', text: '#1e3a8a' },
  orange: { label: 'Orange', bg: '#ffedd5', border: '#fb923c', text: '#7c2d12' },
  pink: { label: 'Pink', bg: '#fce7f3', border: '#f472b6', text: '#831843' },
  yellow: { label: 'Yellow', bg: '#fef9c3', border: '#facc15', text: '#713f12' },
  green: { label: 'Green', bg: '#dcfce7', border: '#4ade80', text: '#14532d' },
  indigo: { label: 'Indigo', bg: '#e0e7ff', border: '#818cf8', text: '#312e81' },
  stone: { label: 'Stone', bg: '#f5f5f4', border: '#a8a29e', text: '#292524' },
};

/** Stock size, caption and tint for each reference-object type. */
export const REFERENCE_OBJECT_DEFAULTS: Record<
  ReferenceObjectType,
  { width: number; height: number; label: string; color: string }
> = {
  danceFloor: { width: 200, height: 200, label: 'Dance Floor', color: 'purple' },
  bar: { width: 150, height: 80, label: 'Bar', color: 'blue' },
  buffet: { width: 180, height: 60, label: 'Buffet', color: 'orange' },
  cake: { width: 80, height: 80, label: 'Cake Table', color: 'pink' },
  gift: { width: 80, height: 80, label: 'Gift Table', color: 'yellow' },
  entrance: { width: 100, height: 40, label: 'Entrance', color: 'green' },
  stage: { width: 200, height: 100, label: 'Stage', color: 'indigo' },
};

/** One-tap label texts, so the common captions are not retyped every event. */
export const LABEL_PRESETS = [
  'Head Table',
  'Entrance',
  'Bar',
  'Dance Floor',
  'Gift Table',
  'Cake',
  'Buffet',
  'Stage',
  'Restrooms',
];

export const DEFAULT_SHAPE_SIZE: Record<ShapeType, { width: number; height: number }> = {
  rectangle: { width: 240, height: 160 },
  circle: { width: 180, height: 180 },
  line: { width: 200, height: 6 },
};

/* ---- normalisation ----------------------------------------------------- */

const oneOf = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const finite = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A CSS colour we are willing to store: a hex literal, or a palette key. */
export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

function normalizeText(value: unknown, fallback: string, maxLength = 200): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || fallback;
}

/** Optional free text: empty means "no override", not an empty caption. */
function normalizeOptionalText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

export function normalizeLabel(raw: unknown): Omit<Label, 'id'> {
  const input = (raw ?? {}) as Record<string, unknown>;
  return {
    text: normalizeText(input.text, 'Label'),
    x: finite(input.x),
    y: finite(input.y),
    fontSize: Math.round(clamp(finite(input.fontSize, 18), LABEL_FONT_MIN, LABEL_FONT_MAX)),
    rotation: finite(input.rotation),
    color: normalizeHexColor(input.color, '#064e3b'),
    background: oneOf(LABEL_BACKGROUNDS, input.background, 'light'),
    bold: input.bold === undefined ? true : Boolean(input.bold),
    align: oneOf(TEXT_ALIGNMENTS, input.align, 'center'),
  };
}

export function normalizeShape(raw: unknown): Omit<Shape, 'id'> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const type = oneOf(SHAPE_TYPES, input.type, 'rectangle');
  const fallbackSize = DEFAULT_SHAPE_SIZE[type];
  return {
    type,
    x: finite(input.x),
    y: finite(input.y),
    // A line is intentionally allowed to be thinner than OBJECT_MIN_SIZE.
    width: clamp(finite(input.width, fallbackSize.width), OBJECT_MIN_SIZE, OBJECT_MAX_SIZE),
    height: clamp(finite(input.height, fallbackSize.height), type === 'line' ? 2 : OBJECT_MIN_SIZE, OBJECT_MAX_SIZE),
    rotation: finite(input.rotation),
    color: normalizeHexColor(input.color, '#22c55e'),
    opacity: clamp(finite(input.opacity, 0.15), 0, 1),
    borderColor: normalizeHexColor(input.borderColor, '#22c55e'),
    borderStyle: oneOf(BORDER_STYLES, input.borderStyle, 'dashed'),
    label: normalizeOptionalText(input.label),
  };
}

export function normalizeReferenceObject(raw: unknown): Omit<ReferenceObject, 'id'> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const type = oneOf(REFERENCE_OBJECT_TYPES, input.type, 'danceFloor');
  const defaults = REFERENCE_OBJECT_DEFAULTS[type];
  const color = typeof input.color === 'string' && REFERENCE_OBJECT_COLORS[input.color] ? input.color : null;
  return {
    type,
    x: finite(input.x),
    y: finite(input.y),
    width: clamp(finite(input.width, defaults.width), OBJECT_MIN_SIZE, OBJECT_MAX_SIZE),
    height: clamp(finite(input.height, defaults.height), OBJECT_MIN_SIZE, OBJECT_MAX_SIZE),
    rotation: finite(input.rotation),
    label: normalizeOptionalText(input.label, 60),
    color,
  };
}

/** What a reference object actually renders as, once its overrides are applied. */
export function resolveReferenceObject(object: Pick<ReferenceObject, 'type' | 'label' | 'color'>) {
  const defaults = REFERENCE_OBJECT_DEFAULTS[object.type] ?? REFERENCE_OBJECT_DEFAULTS.danceFloor;
  const palette = REFERENCE_OBJECT_COLORS[object.color ?? defaults.color] ?? REFERENCE_OBJECT_COLORS.stone;
  return { label: object.label || defaults.label, palette };
}

/** Rows as they come back from the database, widened to what the canvas wants. */
export function hydrateLabel(row: Record<string, unknown>): Label {
  return { id: String(row.id), ...normalizeLabel(row) };
}

export function hydrateShape(row: Record<string, unknown>): Shape {
  return { id: String(row.id), ...normalizeShape(row) };
}

export function hydrateReferenceObject(row: Record<string, unknown>): ReferenceObject {
  return { id: String(row.id), ...normalizeReferenceObject(row) };
}
