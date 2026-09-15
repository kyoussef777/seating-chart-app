import type { Rect } from '@/lib/floorplan';

/** Everything the canvas can select, move, resize or rotate. */
export type ItemKind = 'table' | 'label' | 'shape' | 'ref';

/**
 * A canvas item reduced to the geometry the interaction layer needs.
 *
 * Tables, labels, shapes and reference objects are stored in four different
 * shapes, and every gesture used to be written four times over. Each gesture
 * now works against this one view of them instead, and writes back through the
 * kind.
 */
export interface CanvasItem extends Rect {
  kind: ItemKind;
  id: string;
  rotation: number;
  /** Labels are sized by their text, so they resize by font size instead of
   *  by width and height. */
  resizable: boolean;
  /** Shown in the status bar and the inspector heading. */
  name: string;
}

export type ItemPatch = { id: string; x: number; y: number };
