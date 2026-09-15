import { Cake, DoorOpen, Gift, type LucideIcon, MapPin, Music, Utensils, Wine } from 'lucide-react';
import type { ReferenceObjectType } from '@/lib/layout-objects';

/**
 * The icon each reference-object type draws with.
 *
 * Kept apart from `lib/layout-objects.ts` so the API routes can import that
 * module's types and normalisers without dragging an icon library into a
 * server bundle.
 */
export const REFERENCE_OBJECT_ICONS: Record<ReferenceObjectType, LucideIcon> = {
  danceFloor: Music,
  bar: Wine,
  buffet: Utensils,
  cake: Cake,
  gift: Gift,
  entrance: DoorOpen,
  stage: MapPin,
};
