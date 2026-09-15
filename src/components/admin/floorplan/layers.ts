/**
 * Stacking order on the floor plan.
 *
 * Zones and venue furniture are backdrops, tables sit on them, and labels are
 * annotations that have to stay readable — and clickable — over whatever they
 * caption.
 *
 * Shared by the canvas and by DraggableTable on purpose. Each table sets its
 * own z-index, which makes it a stacking context: anything inside a table can
 * only ever paint within that table's slot in the order, however large its own
 * z-index is. That is why a table's guest list appeared *behind* the table next
 * to it — the pop-up's `z-50` is scoped to its own table, so a neighbour later
 * in the DOM covered it. A table therefore has to lift its whole self while its
 * pop-up is open, and it cannot do that from a number defined somewhere else.
 */
export const LAYER = {
  shape: 1,
  ref: 2,
  table: 3,
  label: 10,
  /** A table showing its guest list, lifted clear of its neighbours. */
  tablePopup: 30,
  /** A table being dragged, lifted clear of everything it passes over. */
  tableDragging: 20,
  guide: 35,
  marquee: 45,
} as const;
