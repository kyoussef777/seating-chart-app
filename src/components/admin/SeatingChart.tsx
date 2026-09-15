'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignVerticalSpaceAround,
  ChevronDown,
  Circle,
  FileSpreadsheet,
  Grid as GridIcon,
  Hand,
  Lock,
  // Aliased: the bare name shadows the global Map constructor.
  Map as MapIcon,
  Maximize,
  Minus,
  MousePointer2,
  Move,
  Plus,
  Redo2,
  Save,
  Search,
  Shuffle,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ARRANGE_LAYOUTS,
  type AlignMode,
  type ArrangeLayout,
  type Guide,
  type Rect,
  type ResizeHandle,
  alignBoxes,
  angleFromCentre,
  arrangeTables,
  clampGroupDelta,
  clampItemsIntoBounds,
  computeSnapGuides,
  distributeBoxes,
  duplicateName,
  estimateLabelSize,
  itemsInMarquee,
  normalizeAngle,
  rectFromPoints,
  resizeBox,
  snapAngle,
  snapValue,
} from '@/lib/floorplan';
import {
  DEFAULT_SHAPE_SIZE,
  LABEL_FONT_MAX,
  LABEL_FONT_MIN,
  LABEL_PRESETS,
  OBJECT_MAX_SIZE,
  OBJECT_MIN_SIZE,
  REFERENCE_OBJECT_DEFAULTS,
  REFERENCE_OBJECT_TYPES,
  hydrateLabel,
  hydrateReferenceObject,
  hydrateShape,
  resolveReferenceObject,
  type Label,
  type ReferenceObject,
  type ReferenceObjectType,
  type Shape,
} from '@/lib/layout-objects';
import {
  CANVAS_HEIGHT,
  CANVAS_MAX,
  CANVAS_MIN,
  CANVAS_WIDTH,
  DEFAULT_TABLE_CAPACITY,
  TABLE_CAPACITY_MAX,
  TABLE_MAX_SIZE,
  TABLE_MIN_SIZE,
  TABLE_SHAPES,
  TABLE_SHAPE_LABELS,
  type CanvasSize,
  type Guest,
  type Table,
  type TableShape,
  clampBox,
  fetchSeating,
  getTableDimensions,
  isTableShape,
  persistAssignment,
  safeCell,
  seatsAvailable,
} from '@/lib/seating';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsTouch } from '@/hooks/useMediaQuery';
import { useToast } from '@/contexts/ToastContext';
import DraggableTable from './DraggableTable';
import DraggableGuest from './DraggableGuest';
import MoveGuestsDialog from './MoveGuestsDialog';
import Inspector from './floorplan/Inspector';
import MiniMap from './floorplan/MiniMap';
import SelectionOverlay from './floorplan/SelectionOverlay';
import { REFERENCE_OBJECT_ICONS } from './floorplan/icons';
import type { CanvasItem, ItemKind } from './floorplan/types';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
/** How far a pointer must travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 3;
const HISTORY_LIMIT = 50;
/** Arrow-key nudges within this window fold into one undo step. */
const NUDGE_COALESCE_MS = 700;

/**
 * Stacking order on the floor plan.
 *
 * Zones and venue furniture are backdrops, tables sit on them, and labels are
 * annotations that have to stay readable — and clickable — over whatever they
 * caption. Without this everything relied on DOM order, so a label dropped on
 * a table was hidden behind it and could not be selected or retyped again.
 */
const LAYER = {
  shape: 1,
  ref: 2,
  table: 3,
  tableDragging: 20,
  label: 10,
  guide: 35,
  marquee: 45,
} as const;

const clampCanvasValue = (value: number) =>
  Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(value)));

/** One undoable state of the floor plan. Guest seating is deliberately out of
 *  scope: it is a server-side move with its own capacity rules. */
interface Snapshot {
  tables: Array<Pick<
    Table,
    'id' | 'name' | 'shape' | 'capacity' | 'positionX' | 'positionY' | 'rotation' | 'width' | 'height' | 'color'
  >>;
  labels: Label[];
  shapes: Shape[];
  referenceObjects: ReferenceObject[];
}

/** The gesture currently in flight. One shape for every pointer interaction,
 *  so the window-level move loop has a single thing to interpret. */
type Gesture =
  | { kind: 'pan'; pointerX: number; pointerY: number }
  | { kind: 'marquee'; origin: { x: number; y: number }; current: { x: number; y: number }; additive: boolean }
  | {
      kind: 'move';
      originX: number;
      originY: number;
      moved: boolean;
      /** State before the gesture, committed to the undo stack only once
       *  something actually moves. */
      snapshot: Snapshot;
      items: Array<{ kind: ItemKind; id: string; x: number; y: number; width: number; height: number }>;
    }
  | {
      kind: 'resize';
      item: CanvasItem;
      handle: ResizeHandle;
      originX: number;
      originY: number;
      startFontSize: number;
      moved: boolean;
      snapshot: Snapshot;
    }
  | { kind: 'rotate'; item: CanvasItem; grabOffset: number; moved: boolean; snapshot: Snapshot };

/** True for anything that swallows a keystroke, so shortcuts do not fire while
 *  the organiser is typing. The old check missed contenteditable, which meant
 *  typing "g" into a label toggled the grid. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Fire off writes a few at a time: an auto-arrange of forty tables should not
 *  open forty sockets at once. */
async function runInBatches<T>(items: T[], size: number, task: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task));
  }
}

export default function SeatingChart() {
  const themeConfig = useTheme();
  const toast = useToast();
  const isTouch = useIsTouch();

  /* ---- data ---------------------------------------------------------- */
  const [tables, setTables] = useState<Table[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [referenceObjects, setReferenceObjects] = useState<ReferenceObject[]>([]);
  const [loading, setLoading] = useState(true);

  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const debouncedGuestSearchTerm = useDebounce(guestSearchTerm, 300);
  const [seatingGuest, setSeatingGuest] = useState<Guest | null>(null);

  /* ---- editor state --------------------------------------------------- */
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  const [smartGuides, setSmartGuides] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [locked, setLocked] = useState(false);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [showTools, setShowTools] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(true);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTable, setNewTable] = useState<{ name: string; shape: TableShape; capacity: number }>({
    name: '',
    shape: 'round',
    capacity: 8,
  });
  const [openMenu, setOpenMenu] = useState<'object' | 'label' | 'arrange' | null>(null);

  /* ---- view ----------------------------------------------------------- */
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  /* ---- live gesture --------------------------------------------------- */
  const [activeGesture, setActiveGesture] = useState<Gesture['kind'] | null>(null);
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const spaceHeldRef = useRef(false);
  // Two fingers still need raw touch events: pointer events give one stream
  // per finger, and pinch needs both at once.
  const pinchRef = useRef<{ distance: number; zoom: number; midX: number; midY: number } | null>(null);

  // Mirrors of state, so gesture handlers and history can read current values
  // without being re-created (and re-bound) on every keystroke.
  const tablesRef = useRef<Table[]>([]);
  const unassignedGuestsRef = useRef<Guest[]>([]);
  const labelsRef = useRef<Label[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  const referenceObjectsRef = useRef<ReferenceObject[]>([]);
  const canvasSizeRef = useRef(canvasSize);
  const lockedRef = useRef(locked);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);
  useEffect(() => {
    unassignedGuestsRef.current = unassignedGuests;
  }, [unassignedGuests]);
  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);
  useEffect(() => {
    referenceObjectsRef.current = referenceObjects;
  }, [referenceObjects]);
  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  /* ---- label measurement ---------------------------------------------- */

  // Labels are sized by their text, so their box has to be measured rather
  // than stored. Selection, marquee hit-testing and clamping all need it.
  const [labelSizes, setLabelSizes] = useState<Record<string, { width: number; height: number }>>({});
  const labelElements = useRef(new Map<string, HTMLElement>());

  useLayoutEffect(() => {
    let changed = false;
    const next = { ...labelSizes };
    for (const label of labels) {
      const el = labelElements.current.get(label.id);
      if (!el) continue;
      // offsetWidth is the layout size, unaffected by the canvas scale().
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const prev = next[label.id];
      if (!prev || Math.abs(prev.width - width) > 0.5 || Math.abs(prev.height - height) > 0.5) {
        next[label.id] = { width, height };
        changed = true;
      }
    }
    for (const id of Object.keys(next)) {
      if (!labels.some((l) => l.id === id)) {
        delete next[id];
        changed = true;
      }
    }
    // Converges in one pass: measuring cannot change what was measured, so
    // the re-run this schedules finds nothing to update and stops.
    if (changed) setLabelSizes(next);
  }, [labels, labelSizes]);

  // Turning on contentEditable does not move the caret into the element, so a
  // label added or double-clicked for editing looked editable but swallowed
  // every keystroke. Focus it and select its text, so typing replaces a
  // placeholder and End appends to an existing caption.
  useEffect(() => {
    if (!editingLabelId) return;
    const element = labelElements.current.get(editingLabelId);
    if (!element) return;
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editingLabelId]);

  /* ---- the unified item view ------------------------------------------ */

  const canvasItems = useMemo<CanvasItem[]>(() => {
    const items: CanvasItem[] = [];
    for (const shape of shapes) {
      items.push({
        kind: 'shape',
        id: shape.id,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rotation: shape.rotation,
        resizable: true,
        name: shape.label || `${shape.type[0].toUpperCase()}${shape.type.slice(1)}`,
      });
    }
    for (const object of referenceObjects) {
      items.push({
        kind: 'ref',
        id: object.id,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        resizable: true,
        name: resolveReferenceObject(object).label,
      });
    }
    for (const label of labels) {
      const size = labelSizes[label.id] ?? estimateLabelSize(label.text, label.fontSize, label.bold);
      items.push({
        kind: 'label',
        id: label.id,
        x: label.x,
        y: label.y,
        width: size.width,
        height: size.height,
        rotation: label.rotation,
        resizable: true,
        name: label.text,
      });
    }
    for (const table of tables) {
      const { width, height } = getTableDimensions(table.shape, table);
      items.push({
        kind: 'table',
        id: table.id,
        x: table.positionX,
        y: table.positionY,
        width,
        height,
        rotation: table.rotation || 0,
        resizable: true,
        name: table.name,
      });
    }
    return items;
  }, [labelSizes, labels, referenceObjects, shapes, tables]);

  const itemsById = useMemo(() => new Map(canvasItems.map((item) => [item.id, item])), [canvasItems]);
  const itemsByIdRef = useRef(itemsById);
  useEffect(() => {
    itemsByIdRef.current = itemsById;
  }, [itemsById]);
  const canvasItemsRef = useRef(canvasItems);
  useEffect(() => {
    canvasItemsRef.current = canvasItems;
  }, [canvasItems]);

  const selectedCanvasItems = useMemo(
    () => canvasItems.filter((item) => selectedItems.has(item.id)),
    [canvasItems, selectedItems]
  );

  const filteredGuests = useMemo(() => {
    const query = debouncedGuestSearchTerm.trim().toLowerCase();
    if (!query) return unassignedGuests;
    return unassignedGuests.filter((guest) => guest.name.toLowerCase().includes(query));
  }, [debouncedGuestSearchTerm, unassignedGuests]);

  /* ---- preferences and layout persistence ------------------------------ */

  const layoutLoadedRef = useRef(false);
  const lastSavedLayoutRef = useRef<string | null>(null);

  useEffect(() => {
    const loadLayoutData = async () => {
      try {
        const savedPreferences = localStorage.getItem('seatingChartPreferences');
        if (savedPreferences) {
          const prefs = JSON.parse(savedPreferences);
          if (prefs.showGrid !== undefined) setShowGrid(prefs.showGrid);
          if (prefs.snapToGrid !== undefined) setSnapToGrid(prefs.snapToGrid);
          if (prefs.gridSize !== undefined) setGridSize(prefs.gridSize);
          if (prefs.smartGuides !== undefined) setSmartGuides(prefs.smartGuides);
          if (prefs.showMiniMap !== undefined) setShowMiniMap(prefs.showMiniMap);
          if (prefs.locked !== undefined) setLocked(prefs.locked);
          if (prefs.tool === 'select' || prefs.tool === 'pan') setTool(prefs.tool);
          if (prefs.canvasWidth && prefs.canvasHeight) {
            setCanvasSize({
              width: clampCanvasValue(prefs.canvasWidth),
              height: clampCanvasValue(prefs.canvasHeight),
            });
          }
        }
      } catch (error) {
        console.error('Failed to read seating chart preferences:', error);
      }

      try {
        const [labelsRes, shapesRes, objectsRes] = await Promise.all([
          fetch('/api/layout/labels'),
          fetch('/api/layout/shapes'),
          fetch('/api/layout/reference-objects'),
        ]);

        let loadedLabels: Label[] = [];
        let loadedShapes: Shape[] = [];
        let loadedObjects: ReferenceObject[] = [];

        // Hydrating through the shared normaliser means a row written before
        // the styling columns existed still arrives fully populated.
        if (labelsRes.ok) {
          loadedLabels = ((await labelsRes.json()) as Record<string, unknown>[]).map(hydrateLabel);
          setLabels(loadedLabels);
        }
        if (shapesRes.ok) {
          loadedShapes = ((await shapesRes.json()) as Record<string, unknown>[]).map(hydrateShape);
          setShapes(loadedShapes);
        }
        if (objectsRes.ok) {
          loadedObjects = ((await objectsRes.json()) as Record<string, unknown>[]).map(hydrateReferenceObject);
          setReferenceObjects(loadedObjects);
        }

        // Only now may autosave write: a failed load must never be persisted
        // back over the real layout. Recording what was loaded also stops the
        // first render from writing it straight back.
        lastSavedLayoutRef.current = JSON.stringify({
          labels: loadedLabels,
          shapes: loadedShapes,
          referenceObjects: loadedObjects,
        });
        layoutLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load layout data:', error);
      }
    };

    loadLayoutData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'seatingChartPreferences',
        JSON.stringify({
          showGrid,
          snapToGrid,
          gridSize,
          smartGuides,
          showMiniMap,
          locked,
          tool,
          canvasWidth: canvasSize.width,
          canvasHeight: canvasSize.height,
        })
      );
    } catch (error) {
      console.error('Failed to save seating chart preferences:', error);
    }
  }, [showGrid, snapToGrid, gridSize, smartGuides, showMiniMap, locked, tool, canvasSize]);

  // Layout objects live in the database, so persist them as they change.
  const layoutPayload = JSON.stringify({ labels, shapes, referenceObjects });
  const debouncedLayout = useDebounce(layoutPayload, 800);
  const inflightLayoutRef = useRef<string | null>(null);
  useEffect(() => {
    if (!layoutLoadedRef.current) return;
    if (debouncedLayout === lastSavedLayoutRef.current) return;
    // Do not re-post a body that is already on its way.
    if (debouncedLayout === inflightLayoutRef.current) return;

    const body = debouncedLayout;
    inflightLayoutRef.current = body;
    Promise.all([
      fetch('/api/layout/labels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      fetch('/api/layout/shapes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      fetch('/api/layout/reference-objects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
    ])
      .then((responses) => {
        // Only now is it saved. Marking it up front — as this used to — meant a
        // rejected save (a 401 after the session expired, a 429, a dropped
        // connection) was recorded as written and never retried, so the edit
        // was silently lost at the next reload.
        if (responses.every((response) => response.ok)) {
          lastSavedLayoutRef.current = body;
          return;
        }
        console.error('Layout autosave rejected:', responses.map((r) => r.status));
        toast.error('Could not save the floor plan. Use Save Layout to try again.');
      })
      .catch((error) => {
        console.error('Failed to autosave layout:', error);
        toast.error('Could not save the floor plan. Use Save Layout to try again.');
      })
      .finally(() => {
        if (inflightLayoutRef.current === body) inflightLayoutRef.current = null;
      });
  }, [debouncedLayout, toast]);

  const savePreferences = useCallback(async () => {
    try {
      const body = JSON.stringify({ labels, shapes, referenceObjects });
      const responses = await Promise.all([
        fetch('/api/layout/labels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
        fetch('/api/layout/shapes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
        fetch('/api/layout/reference-objects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error('Layout save rejected');
      lastSavedLayoutRef.current = body;
      toast.success('Layout saved');
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast.error('Failed to save layout');
    }
  }, [labels, shapes, referenceObjects, toast]);

  /* ---- seating data ---------------------------------------------------- */

  const loadSeating = useCallback(async (initial = false) => {
    try {
      const { tables: withGuests, unassigned } = await fetchSeating();
      setTables(withGuests);
      setUnassignedGuests(unassigned);
    } catch (error) {
      console.error('Failed to load seating data:', error);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => loadSeating(false), [loadSeating]);

  useEffect(() => {
    loadSeating(true);
  }, [loadSeating]);

  /** Write a table change through, and reconcile if the server refuses. */
  const persistTable = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        const response = await fetch('/api/tables', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...patch }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          toast.error(data.error || 'Failed to save the table');
          await refreshData();
        }
      } catch (error) {
        console.error('Failed to save table:', error);
        toast.error('Failed to save the table');
      }
    },
    [refreshData, toast]
  );

  const persistTablePositions = useCallback(
    async (moves: Array<{ id: string; x: number; y: number }>) => {
      await runInBatches(moves, 6, (move) =>
        fetch('/api/tables', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: move.id, positionX: move.x, positionY: move.y }),
        }).catch((error) => console.error('Failed to save table position:', error))
      );
    },
    []
  );

  /* ---- history --------------------------------------------------------- */

  const historyRef = useRef<{ past: Snapshot[]; future: Snapshot[] }>({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
  const lastNudgeRef = useRef(0);

  const takeSnapshot = useCallback(
    (): Snapshot => ({
      tables: tablesRef.current.map((t) => ({
        id: t.id,
        name: t.name,
        shape: t.shape,
        capacity: t.capacity,
        positionX: t.positionX,
        positionY: t.positionY,
        rotation: t.rotation,
        width: t.width ?? null,
        height: t.height ?? null,
        color: t.color ?? null,
      })),
      labels: labelsRef.current.map((l) => ({ ...l })),
      shapes: shapesRef.current.map((s) => ({ ...s })),
      referenceObjects: referenceObjectsRef.current.map((r) => ({ ...r })),
    }),
    []
  );

  /** Commit a snapshot taken earlier. Gestures capture state when they start
   *  but only commit here once something has actually moved, so a plain click
   *  to select does not bury the real change under a pile of no-op entries. */
  const pushSnapshot = useCallback((snapshot: Snapshot) => {
    const history = historyRef.current;
    history.past.push(snapshot);
    if (history.past.length > HISTORY_LIMIT) history.past.shift();
    history.future = [];
    setHistoryVersion((version) => version + 1);
  }, []);

  const pushHistory = useCallback(() => pushSnapshot(takeSnapshot()), [pushSnapshot, takeSnapshot]);

  const applySnapshot = useCallback(
    (snapshot: Snapshot) => {
      const byId = new Map(snapshot.tables.map((t) => [t.id, t]));

      // Diff against the ref, not inside the setTables updater: React defers
      // that callback, so anything collected in it is still empty by the time
      // the writes below are sent — which silently made undo a local-only
      // change that the next reload threw away.
      const changed = tablesRef.current
        .map((table) => {
          const restored = byId.get(table.id);
          // A table added or deleted since the snapshot is left alone: those
          // are server-side operations and sit outside the undo stack.
          if (!restored) return null;
          const differs =
            restored.positionX !== table.positionX ||
            restored.positionY !== table.positionY ||
            restored.rotation !== table.rotation ||
            restored.name !== table.name ||
            restored.shape !== table.shape ||
            restored.capacity !== table.capacity ||
            (restored.width ?? null) !== (table.width ?? null) ||
            (restored.height ?? null) !== (table.height ?? null) ||
            (restored.color ?? null) !== (table.color ?? null);
          return differs ? restored : null;
        })
        .filter((restored): restored is Snapshot['tables'][number] => restored !== null);

      setTables((prev) =>
        prev.map((table) => {
          const restored = byId.get(table.id);
          return restored ? { ...table, ...restored } : table;
        })
      );

      setLabels(snapshot.labels.map((l) => ({ ...l })));
      setShapes(snapshot.shapes.map((s) => ({ ...s })));
      setReferenceObjects(snapshot.referenceObjects.map((r) => ({ ...r })));

      if (changed.length > 0) {
        runInBatches(changed, 6, ({ id, ...patch }) =>
          fetch('/api/tables', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...patch }),
          }).catch((error) => console.error('Failed to restore table:', error))
        );
      }
    },
    []
  );

  const undo = useCallback(() => {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.push(takeSnapshot());
    applySnapshot(previous);
    setHistoryVersion((version) => version + 1);
  }, [applySnapshot, takeSnapshot]);

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(takeSnapshot());
    applySnapshot(next);
    setHistoryVersion((version) => version + 1);
  }, [applySnapshot, takeSnapshot]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  void historyVersion; // the counter exists purely to re-render those flags

  /* ---- view helpers ---------------------------------------------------- */

  // Live view, updated the moment a gesture computes it: a burst of wheel
  // events can arrive before React re-renders, and each must build on the
  // previous one rather than on a stale zoom.
  const viewRef = useRef({ zoom: zoomLevel, pan: panOffset });
  useEffect(() => {
    viewRef.current = { zoom: zoomLevel, pan: panOffset };
  }, [zoomLevel, panOffset]);

  /** Screen point to floor-plan coordinates. */
  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    const { zoom, pan } = viewRef.current;
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, []);

  const zoomTo = useCallback((next: number, clientX?: number, clientY?: number) => {
    const { zoom: prevZoom, pan: prevPan } = viewRef.current;
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (zoom === prevZoom) return;

    let pan = prevPan;
    const rect = chartRef.current?.getBoundingClientRect();
    if (rect) {
      const anchorX = (clientX ?? rect.left + rect.width / 2) - rect.left;
      const anchorY = (clientY ?? rect.top + rect.height / 2) - rect.top;
      pan = {
        x: anchorX - ((anchorX - prevPan.x) / prevZoom) * zoom,
        y: anchorY - ((anchorY - prevPan.y) / prevZoom) * zoom,
      };
      setPanOffset(pan);
    }

    viewRef.current = { zoom, pan };
    setZoomLevel(zoom);
  }, []);

  const zoomBy = useCallback(
    (factor: number, clientX?: number, clientY?: number) => zoomTo(viewRef.current.zoom * factor, clientX, clientY),
    [zoomTo]
  );

  const fitToView = useCallback(() => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((rect.width - 24) / canvasSize.width, (rect.height - 24) / canvasSize.height))
    );
    const pan = {
      x: (rect.width - canvasSize.width * zoom) / 2,
      y: (rect.height - canvasSize.height * zoom) / 2,
    };
    viewRef.current = { zoom, pan };
    setZoomLevel(zoom);
    setPanOffset(pan);
  }, [canvasSize]);

  /** Centre the view on a floor-plan point (the minimap drives this). */
  const centreOn = useCallback((point: { x: number; y: number }) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { zoom } = viewRef.current;
    const pan = { x: rect.width / 2 - point.x * zoom, y: rect.height / 2 - point.y * zoom };
    viewRef.current = { zoom, pan };
    setPanOffset(pan);
  }, []);

  const framedRef = useRef(false);
  useEffect(() => {
    if (loading || framedRef.current) return;
    framedRef.current = true;
    fitToView();
  }, [loading, fitToView]);

  // Keep the minimap's viewport rectangle honest as the pane resizes.
  useEffect(() => {
    const element = chartRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Wheel only zooms with a modifier (a trackpad pinch reports ctrlKey), so a
  // plain scroll still scrolls the admin page instead of being swallowed.
  // Bound natively because React's wheel listener is passive.
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const viewport = useMemo(
    () => ({
      x: -panOffset.x / zoomLevel,
      y: -panOffset.y / zoomLevel,
      width: viewportSize.width / zoomLevel,
      height: viewportSize.height / zoomLevel,
    }),
    [panOffset.x, panOffset.y, viewportSize.height, viewportSize.width, zoomLevel]
  );

  /** Middle of the visible floor plan, offset so a box of the given size lands
   *  centred there. New items appear where the organiser is looking. */
  const viewCentre = useCallback(
    (size?: { width: number; height: number }) => {
      const rect = chartRef.current?.getBoundingClientRect();
      const width = size?.width ?? 0;
      const height = size?.height ?? 0;
      const { zoom, pan } = viewRef.current;
      const x = rect ? (rect.width / 2 - pan.x) / zoom : canvasSize.width / 2;
      const y = rect ? (rect.height / 2 - pan.y) / zoom : canvasSize.height / 2;
      const placed = clampBox(
        snapValue(x - width / 2, gridSize, snapToGrid),
        snapValue(y - height / 2, gridSize, snapToGrid),
        width,
        height,
        canvasSize
      );
      return { x: placed.x, y: placed.y };
    },
    [canvasSize, gridSize, snapToGrid]
  );

  /* ---- writing back to each collection ---------------------------------- */

  const updateLabel = useCallback((id: string, patch: Partial<Label>) => {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const updateShape = useCallback((id: string, patch: Partial<Shape>) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const updateReferenceObject = useCallback((id: string, patch: Partial<ReferenceObject>) => {
    setReferenceObjects((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const updateTable = useCallback(
    (id: string, patch: Partial<Table>) => {
      pushHistory();
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const payload: Record<string, unknown> = {};
      for (const key of ['name', 'shape', 'capacity', 'rotation', 'width', 'height', 'color'] as const) {
        if (key in patch) payload[key] = patch[key];
      }
      if ('positionX' in patch) payload.positionX = patch.positionX;
      if ('positionY' in patch) payload.positionY = patch.positionY;
      if (Object.keys(payload).length > 0) persistTable(id, payload);
    },
    [persistTable, pushHistory]
  );

  /** Move any item, by kind. The four collections store position differently,
   *  so this is the one place that knows about the difference. */
  const setItemPosition = useCallback((kind: ItemKind, id: string, x: number, y: number) => {
    if (kind === 'table') {
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, positionX: x, positionY: y } : t)));
    } else if (kind === 'label') {
      setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, x, y } : l)));
    } else if (kind === 'shape') {
      setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
    } else {
      setReferenceObjects((prev) => prev.map((r) => (r.id === id ? { ...r, x, y } : r)));
    }
  }, []);

  /* ---- selection -------------------------------------------------------- */

  const selectItem = useCallback((id: string, additive: boolean) => {
    setSelectedItems((prev) => {
      if (!additive) return prev.size === 1 && prev.has(id) ? prev : new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems((prev) => (prev.size ? new Set() : prev));
    setEditingLabelId(null);
  }, []);

  /* ---- deleting --------------------------------------------------------- */

  const deleteTable = useCallback(
    async (tableId: string) => {
      try {
        const response = await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete rejected');
        setTables((prev) => prev.filter((t) => t.id !== tableId));
        await refreshData();
        return true;
      } catch (error) {
        console.error('Failed to delete table:', error);
        toast.error('Failed to delete the table');
        return false;
      }
    },
    [refreshData, toast]
  );

  /**
   * Delete a selection of any mix of item kinds.
   *
   * Tables are a server-side delete that unseats their guests, so they are
   * confirmed. Previously Delete simply ignored a selected table while still
   * reporting "Deleted", which read as data loss that had not happened.
   */
  const deleteSelection = useCallback(
    async (ids: Set<string>) => {
      if (ids.size === 0 || lockedRef.current) return;

      const items = canvasItemsRef.current.filter((item) => ids.has(item.id));
      const tableItems = items.filter((item) => item.kind === 'table');
      const decorationIds = new Set(items.filter((item) => item.kind !== 'table').map((item) => item.id));

      let deletedTables = 0;
      if (tableItems.length > 0) {
        const names = tableItems.map((t) => t.name).join(', ');
        const confirmed = window.confirm(
          tableItems.length === 1
            ? `Delete ${names}? Anyone seated there will be unassigned.`
            : `Delete ${tableItems.length} tables (${names})? Anyone seated there will be unassigned.`
        );
        if (confirmed) {
          for (const item of tableItems) {
            if (await deleteTable(item.id)) deletedTables += 1;
          }
        }
      }

      if (decorationIds.size > 0) {
        pushHistory();
        setLabels((prev) => prev.filter((l) => !decorationIds.has(l.id)));
        setShapes((prev) => prev.filter((s) => !decorationIds.has(s.id)));
        setReferenceObjects((prev) => prev.filter((r) => !decorationIds.has(r.id)));
      }

      const removed = deletedTables + decorationIds.size;
      if (removed === 0) return;

      setSelectedItems((prev) => {
        const next = new Set(prev);
        for (const item of items) {
          if (item.kind !== 'table' || deletedTables > 0) next.delete(item.id);
        }
        return next;
      });
      toast.success(removed > 1 ? `Deleted ${removed} items` : 'Deleted');
    },
    [deleteTable, pushHistory, toast]
  );

  /* ---- adding and duplicating -------------------------------------------- */

  const addLabel = useCallback(
    (text: string) => {
      const size = estimateLabelSize(text, 20, true);
      const id = `label-${Date.now()}`;
      pushHistory();
      setLabels((prev) => [
        ...prev,
        {
          id,
          text,
          ...viewCentre(size),
          fontSize: 20,
          rotation: 0,
          color: '#064e3b',
          background: 'light',
          bold: true,
          align: 'center',
        },
      ]);
      setSelectedItems(new Set([id]));
      // Straight into edit mode: a label you have to hunt for a way to retype
      // is a label you will leave saying "New Label".
      setEditingLabelId(id);
      setOpenMenu(null);
    },
    [pushHistory, viewCentre]
  );

  const addShape = useCallback(
    (type: Shape['type']) => {
      const size = DEFAULT_SHAPE_SIZE[type];
      const id = `shape-${Date.now()}`;
      pushHistory();
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          ...viewCentre(size),
          width: size.width,
          height: size.height,
          rotation: 0,
          color: '#22c55e',
          opacity: 0.15,
          borderColor: '#22c55e',
          borderStyle: 'dashed',
          label: type === 'rectangle' ? 'Zone' : null,
        },
      ]);
      setSelectedItems(new Set([id]));
      toast.success(`${type[0].toUpperCase()}${type.slice(1)} added`);
    },
    [pushHistory, toast, viewCentre]
  );

  const addReferenceObject = useCallback(
    (type: ReferenceObjectType) => {
      const defaults = REFERENCE_OBJECT_DEFAULTS[type];
      const id = `ref-${Date.now()}`;
      pushHistory();
      setReferenceObjects((prev) => [
        ...prev,
        {
          id,
          type,
          ...viewCentre(defaults),
          width: defaults.width,
          height: defaults.height,
          rotation: 0,
          label: null,
          color: null,
        },
      ]);
      setSelectedItems(new Set([id]));
      setOpenMenu(null);
      toast.success(`${defaults.label} added`);
    },
    [pushHistory, toast, viewCentre]
  );

  const duplicateItem = useCallback(
    async (item: CanvasItem) => {
      if (lockedRef.current) return;
      const offset = 30;
      const place = (width: number, height: number) =>
        clampBox(item.x + offset, item.y + offset, width, height, canvasSizeRef.current);

      if (item.kind === 'table') {
        const source = tablesRef.current.find((t) => t.id === item.id);
        if (!source) return;
        const spot = place(item.width, item.height);
        try {
          const response = await fetch('/api/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: duplicateName(source.name, tablesRef.current.map((t) => t.name)),
              shape: source.shape,
              capacity: source.capacity,
              positionX: spot.x,
              positionY: spot.y,
              rotation: source.rotation,
              width: source.width ?? null,
              height: source.height ?? null,
              color: source.color ?? null,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Duplicate rejected');
          setTables((prev) => [...prev, { ...data.table, guests: [] }]);
          setSelectedItems(new Set([data.table.id]));
          toast.success(`${data.table.name} added`);
        } catch (error) {
          console.error('Failed to duplicate table:', error);
          toast.error('Failed to duplicate the table');
        }
        return;
      }

      pushHistory();
      const id = `${item.kind}-${Date.now()}`;
      if (item.kind === 'label') {
        const source = labelsRef.current.find((l) => l.id === item.id);
        if (!source) return;
        const spot = place(item.width, item.height);
        setLabels((prev) => [...prev, { ...source, id, x: spot.x, y: spot.y }]);
      } else if (item.kind === 'shape') {
        const source = shapesRef.current.find((s) => s.id === item.id);
        if (!source) return;
        const spot = place(source.width, source.height);
        setShapes((prev) => [...prev, { ...source, id, x: spot.x, y: spot.y }]);
      } else {
        const source = referenceObjectsRef.current.find((r) => r.id === item.id);
        if (!source) return;
        const spot = place(source.width, source.height);
        setReferenceObjects((prev) => [...prev, { ...source, id, x: spot.x, y: spot.y }]);
      }
      setSelectedItems(new Set([id]));
      toast.success('Duplicated');
    },
    [pushHistory, toast]
  );

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTable.name.trim();
    if (!name) return;

    const clash = tables.some((t) => t.name.toLowerCase() === name.toLowerCase());
    if (clash) {
      toast.error('A table with this name already exists');
      return;
    }

    try {
      const dimensions = getTableDimensions(newTable.shape);
      const spot = viewCentre(dimensions);
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shape: newTable.shape,
          capacity: newTable.capacity,
          positionX: spot.x,
          positionY: spot.y,
          rotation: 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Create rejected');
      setTables((prev) => [...prev, { ...data.table, guests: [] }]);
      setSelectedItems(new Set([data.table.id]));
      setNewTable({ name: '', shape: 'round', capacity: 8 });
      setShowAddTable(false);
      toast.success('Table added successfully');
    } catch (error) {
      console.error('Failed to add table:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add table');
    }
  };

  /* ---- guests ------------------------------------------------------------ */

  /** Move a guest between tables in local state so the UI responds instantly;
   *  the server call reconciles afterwards. */
  const applyAssignment = useCallback((guestId: string, tableId: string | null) => {
    setTables((prevTables) => {
      let moving = prevTables.flatMap((t) => t.guests).find((g) => g.id === guestId);
      if (!moving) moving = unassignedGuestsRef.current.find((g) => g.id === guestId);
      if (!moving) return prevTables;
      const updated = { ...moving, tableId };

      return prevTables.map((t) => {
        const without = t.guests.filter((g) => g.id !== guestId);
        if (t.id === tableId) {
          return { ...t, guests: [...without, updated].sort((a, b) => a.name.localeCompare(b.name)) };
        }
        return without.length === t.guests.length ? t : { ...t, guests: without };
      });
    });

    setUnassignedGuests((prev) => {
      const existing = prev.find((g) => g.id === guestId);
      if (tableId === null) {
        if (existing) return prev;
        const seated = tablesRef.current.flatMap((t) => t.guests).find((g) => g.id === guestId);
        if (!seated) return prev;
        return [...prev, { ...seated, tableId: null }].sort((a, b) => a.name.localeCompare(b.name));
      }
      return existing ? prev.filter((g) => g.id !== guestId) : prev;
    });
  }, []);

  const handleAssignGuest = useCallback(
    async (guestId: string, tableId: string) => {
      const table = tablesRef.current.find((t) => t.id === tableId);
      // Look across seated guests too: a guest being moved between tables is
      // not in unassignedGuests, which previously made this fail silently.
      const guest =
        unassignedGuestsRef.current.find((g) => g.id === guestId) ||
        tablesRef.current.flatMap((t) => t.guests).find((g) => g.id === guestId);

      if (!guest || !table) {
        toast.error('That guest or table could no longer be found. Refreshing…');
        await refreshData();
        return;
      }

      if (guest.tableId === tableId) return; // no-op

      const partySize = guest.partySize || 1;
      const available = seatsAvailable(table, guestId);
      if (available < partySize) {
        toast.error(
          `Not enough space at ${table.name}. ${guest.name} needs ${partySize} seat${partySize > 1 ? 's' : ''} but only ${available} ${available === 1 ? 'is' : 'are'} free.`
        );
        return;
      }

      const from = guest.tableId;
      applyAssignment(guestId, tableId);

      const result = await persistAssignment(guestId, tableId);
      if (result.ok) {
        toast.success(from ? `${guest.name} moved to ${table.name}` : `${guest.name} seated at ${table.name}`);
      } else {
        toast.error(result.error);
        await refreshData();
      }
    },
    [applyAssignment, refreshData, toast]
  );

  const handleUnassignGuest = useCallback(
    async (guestId: string) => {
      applyAssignment(guestId, null);
      const result = await persistAssignment(guestId, null);
      if (result.ok) {
        toast.success('Guest unassigned');
      } else {
        toast.error(result.error);
        await refreshData();
      }
    },
    [applyAssignment, refreshData, toast]
  );

  const handleRenameTable = useCallback(
    (tableId: string, newName: string) => {
      updateTable(tableId, { name: newName });
    },
    [updateTable]
  );

  /* ---- gestures ----------------------------------------------------------- */

  const beginGesture = useCallback((gesture: Gesture) => {
    gestureRef.current = gesture;
    setActiveGesture(gesture.kind);
    if (gesture.kind === 'move') {
      setDraggingIds(new Set(gesture.items.map((item) => item.id)));
    }
  }, []);

  const endGesture = useCallback(() => {
    gestureRef.current = null;
    setActiveGesture(null);
    setDraggingIds(new Set());
    setMarquee(null);
    setGuides([]);
  }, []);

  /** Start moving whatever was pressed, dragging the whole selection with it. */
  const startItemDrag = useCallback(
    (kind: ItemKind, id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      if ((e.target as HTMLElement).closest('button, input, textarea, [data-no-drag]')) return;
      if (editingLabelId && editingLabelId !== id) setEditingLabelId(null);

      const additive = e.shiftKey;
      selectItem(id, additive);
      if (lockedRef.current) return;

      // Drag the whole selection when the pressed item is part of it.
      const selection = selectedItems.has(id) && !additive ? selectedItems : new Set([id]);
      const items = canvasItemsRef.current
        .filter((item) => selection.has(item.id))
        .map((item) => ({
          kind: item.kind,
          id: item.id,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        }));
      if (items.length === 0) return;

      beginGesture({
        kind: 'move',
        originX: e.clientX,
        originY: e.clientY,
        moved: false,
        snapshot: takeSnapshot(),
        items,
      });
    },
    [beginGesture, editingLabelId, selectItem, selectedItems, takeSnapshot]
  );

  const handleTableDragStart = useCallback(
    (tableId: string, e: React.PointerEvent) => startItemDrag('table', tableId, e),
    [startItemDrag]
  );

  const startResize = useCallback(
    (item: CanvasItem, handle: ResizeHandle, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (lockedRef.current) return;
      const label = labelsRef.current.find((l) => l.id === item.id);
      beginGesture({
        kind: 'resize',
        item,
        handle,
        originX: e.clientX,
        originY: e.clientY,
        startFontSize: label?.fontSize ?? 0,
        moved: false,
        snapshot: takeSnapshot(),
      });
    },
    [beginGesture, takeSnapshot]
  );

  const startRotate = useCallback(
    (item: CanvasItem, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (lockedRef.current) return;
      const point = toCanvasPoint(e.clientX, e.clientY);
      const centre = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
      // Remember where on the dial the grip was grabbed, so the item does not
      // jump to the pointer the instant rotation starts.
      beginGesture({
        kind: 'rotate',
        item,
        grabOffset: angleFromCentre(centre, point.x, point.y) - (item.rotation || 0),
        moved: false,
        snapshot: takeSnapshot(),
      });
    },
    [beginGesture, takeSnapshot, toCanvasPoint]
  );

  /** Empty canvas: pan, or draw a marquee, depending on the active tool. */
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (pinchRef.current) return;
    setEditingLabelId(null);

    // Middle mouse, a held space bar and the pan tool all pan; so does touch,
    // where a marquee would fight the far more common "shove the plan around".
    const wantsPan =
      e.button === 1 || spaceHeldRef.current || tool === 'pan' || e.pointerType === 'touch' || locked;

    if (wantsPan) {
      if (!e.shiftKey) clearSelection();
      beginGesture({ kind: 'pan', pointerX: e.clientX, pointerY: e.clientY });
      return;
    }

    const origin = toCanvasPoint(e.clientX, e.clientY);
    if (!e.shiftKey) clearSelection();
    beginGesture({ kind: 'marquee', origin, current: origin, additive: e.shiftKey });
  };

  // One window-level move loop for every gesture, so releasing outside the
  // canvas still ends them cleanly.
  useEffect(() => {
    if (!activeGesture) return;

    const handleMove = (e: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const { zoom } = viewRef.current;
      const bounds = canvasSizeRef.current;

      if (gesture.kind === 'pan') {
        if (pinchRef.current) return;
        const deltaX = e.clientX - gesture.pointerX;
        const deltaY = e.clientY - gesture.pointerY;
        gesture.pointerX = e.clientX;
        gesture.pointerY = e.clientY;
        setPanOffset((prev) => {
          const next = { x: prev.x + deltaX, y: prev.y + deltaY };
          viewRef.current = { zoom: viewRef.current.zoom, pan: next };
          return next;
        });
        return;
      }

      if (gesture.kind === 'marquee') {
        gesture.current = toCanvasPoint(e.clientX, e.clientY);
        setMarquee(rectFromPoints(gesture.origin, gesture.current));
        return;
      }

      if (gesture.kind === 'move') {
        let deltaX = (e.clientX - gesture.originX) / zoom;
        let deltaY = (e.clientY - gesture.originY) / zoom;
        if (!gesture.moved && Math.hypot(e.clientX - gesture.originX, e.clientY - gesture.originY) > DRAG_THRESHOLD) {
          gesture.moved = true;
          pushSnapshot(gesture.snapshot);
        }
        if (!gesture.moved) return;

        const primary = gesture.items[0];
        if (snapToGrid) {
          // Snap the item under the pointer, and carry the rest by the same
          // adjusted delta so the group keeps its spacing.
          deltaX = snapValue(primary.x + deltaX, gridSize, true) - primary.x;
          deltaY = snapValue(primary.y + deltaY, gridSize, true) - primary.y;
          setGuides([]);
        } else if (smartGuides) {
          const movingIds = new Set(gesture.items.map((item) => item.id));
          const others = canvasItemsRef.current.filter((item) => !movingIds.has(item.id));
          const snapped = computeSnapGuides(
            { x: primary.x + deltaX, y: primary.y + deltaY, width: primary.width, height: primary.height },
            others,
            6,
            bounds
          );
          deltaX += snapped.x;
          deltaY += snapped.y;
          setGuides(snapped.guides);
        }

        const limited = clampGroupDelta(gesture.items, deltaX, deltaY, bounds);
        for (const item of gesture.items) {
          setItemPosition(item.kind, item.id, item.x + limited.x, item.y + limited.y);
        }
        return;
      }

      if (gesture.kind === 'resize') {
        if (!gesture.moved) {
          gesture.moved = true;
          pushSnapshot(gesture.snapshot);
        }
        const deltaX = (e.clientX - gesture.originX) / zoom;
        const deltaY = (e.clientY - gesture.originY) / zoom;
        const { item, handle } = gesture;

        if (item.kind === 'label') {
          // A label has no width of its own — it is as big as its text — so
          // dragging a grip scales the type instead.
          const next = resizeBox(item, handle, deltaX, deltaY, { keepAspect: true, minWidth: 8, minHeight: 8 });
          const ratio = item.height > 0 ? next.height / item.height : 1;
          const fontSize = Math.round(
            Math.min(LABEL_FONT_MAX, Math.max(LABEL_FONT_MIN, gesture.startFontSize * ratio))
          );
          setLabels((prev) => prev.map((l) => (l.id === item.id ? { ...l, fontSize } : l)));
          return;
        }

        const isTable = item.kind === 'table';
        const next = resizeBox(item, handle, deltaX, deltaY, {
          minWidth: isTable ? TABLE_MIN_SIZE : OBJECT_MIN_SIZE,
          minHeight: isTable ? TABLE_MIN_SIZE : 2,
          maxWidth: isTable ? TABLE_MAX_SIZE : OBJECT_MAX_SIZE,
          maxHeight: isTable ? TABLE_MAX_SIZE : OBJECT_MAX_SIZE,
          keepAspect: e.shiftKey,
          bounds,
        });
        const width = snapValue(next.width, gridSize, snapToGrid);
        const height = snapValue(next.height, gridSize, snapToGrid);

        if (isTable) {
          setTables((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, positionX: next.x, positionY: next.y, width, height } : t))
          );
        } else if (item.kind === 'shape') {
          setShapes((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, x: next.x, y: next.y, width, height } : s))
          );
        } else {
          setReferenceObjects((prev) =>
            prev.map((r) => (r.id === item.id ? { ...r, x: next.x, y: next.y, width, height } : r))
          );
        }
        return;
      }

      if (gesture.kind === 'rotate') {
        if (!gesture.moved) {
          gesture.moved = true;
          pushSnapshot(gesture.snapshot);
        }
        const { item } = gesture;
        const point = toCanvasPoint(e.clientX, e.clientY);
        const centre = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
        const raw = angleFromCentre(centre, point.x, point.y) - gesture.grabOffset;
        const rotation = e.shiftKey ? snapAngle(raw) : Math.round(normalizeAngle(raw));

        if (item.kind === 'table') {
          setTables((prev) => prev.map((t) => (t.id === item.id ? { ...t, rotation } : t)));
        } else if (item.kind === 'label') {
          setLabels((prev) => prev.map((l) => (l.id === item.id ? { ...l, rotation } : l)));
        } else if (item.kind === 'shape') {
          setShapes((prev) => prev.map((s) => (s.id === item.id ? { ...s, rotation } : s)));
        } else {
          setReferenceObjects((prev) => prev.map((r) => (r.id === item.id ? { ...r, rotation } : r)));
        }
      }
    };

    const handleUp = () => {
      const gesture = gestureRef.current;
      if (!gesture) {
        endGesture();
        return;
      }

      if (gesture.kind === 'marquee') {
        const band = rectFromPoints(gesture.origin, gesture.current);
        // A click, not a drag: leave the selection cleared rather than
        // selecting every item that happens to sit under a zero-size band.
        if (band.width > 2 || band.height > 2) {
          const hits = itemsInMarquee(canvasItemsRef.current, band);
          setSelectedItems((prev) => {
            if (!gesture.additive) return new Set(hits);
            const next = new Set(prev);
            hits.forEach((id) => next.add(id));
            return next;
          });
        }
      } else if (gesture.kind === 'move' && gesture.moved) {
        const moves = gesture.items
          .filter((item) => item.kind === 'table')
          .map((item) => {
            const table = tablesRef.current.find((t) => t.id === item.id);
            return table ? { id: table.id, x: table.positionX, y: table.positionY } : null;
          })
          .filter((move): move is { id: string; x: number; y: number } => move !== null);
        if (moves.length > 0) persistTablePositions(moves);
      } else if (gesture.kind === 'resize' && gesture.item.kind === 'table' && gesture.moved) {
        const table = tablesRef.current.find((t) => t.id === gesture.item.id);
        if (table) {
          persistTable(table.id, {
            positionX: table.positionX,
            positionY: table.positionY,
            width: table.width ?? null,
            height: table.height ?? null,
          });
        }
      } else if (gesture.kind === 'rotate' && gesture.item.kind === 'table' && gesture.moved) {
        const table = tablesRef.current.find((t) => t.id === gesture.item.id);
        if (table) persistTable(table.id, { rotation: table.rotation });
      }

      endGesture();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [
    activeGesture,
    endGesture,
    gridSize,
    persistTable,
    persistTablePositions,
    pushSnapshot,
    setItemPosition,
    smartGuides,
    snapToGrid,
    toCanvasPoint,
  ]);

  /* ---- touch pinch --------------------------------------------------------- */

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    endGesture();
    pinchRef.current = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      zoom: viewRef.current.zoom,
      midX: (a.clientX + b.clientX) / 2,
      midY: (a.clientY + b.clientY) / 2,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    zoomTo(
      (pinchRef.current.zoom * distance) / pinchRef.current.distance,
      pinchRef.current.midX,
      pinchRef.current.midY
    );
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  /* ---- arranging ----------------------------------------------------------- */

  const applyMoves = useCallback(
    (moves: Array<{ id: string; x: number; y: number }>) => {
      if (moves.length === 0) return;
      pushHistory();
      const tableMoves: Array<{ id: string; x: number; y: number }> = [];
      for (const move of moves) {
        const item = itemsByIdRef.current.get(move.id);
        if (!item) continue;
        setItemPosition(item.kind, move.id, move.x, move.y);
        if (item.kind === 'table') tableMoves.push(move);
      }
      if (tableMoves.length > 0) persistTablePositions(tableMoves);
    },
    [persistTablePositions, pushHistory, setItemPosition]
  );

  const handleAlign = useCallback(
    (mode: AlignMode) => {
      applyMoves(alignBoxes(selectedCanvasItems, mode));
    },
    [applyMoves, selectedCanvasItems]
  );

  const handleDistribute = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      applyMoves(distributeBoxes(selectedCanvasItems, axis));
    },
    [applyMoves, selectedCanvasItems]
  );

  const handleAutoArrange = useCallback(
    (layout: ArrangeLayout) => {
      if (tables.length === 0) return;
      const boxes = tables.map((table) => {
        const { width, height } = getTableDimensions(table.shape, table);
        return { id: table.id, width, height };
      });
      const moves = arrangeTables(boxes, canvasSize, layout, (value) => snapValue(value, gridSize, snapToGrid));
      applyMoves(moves);
      setOpenMenu(null);
      toast.success(`Tables arranged in a ${ARRANGE_LAYOUTS.find((l) => l.id === layout)?.label.toLowerCase()}`);
    },
    [applyMoves, canvasSize, gridSize, snapToGrid, tables, toast]
  );

  /* ---- floor plan resizing -------------------------------------------------- */

  // Shrinking the floor used to strand whatever fell outside the new bounds:
  // invisible, unselectable, and still in the saved layout.
  const previousCanvasRef = useRef(canvasSize);
  useEffect(() => {
    const previous = previousCanvasRef.current;
    previousCanvasRef.current = canvasSize;
    if (previous.width === canvasSize.width && previous.height === canvasSize.height) return;
    if (canvasSize.width >= previous.width && canvasSize.height >= previous.height) return;

    const moves = clampItemsIntoBounds(canvasItemsRef.current, canvasSize);
    if (moves.length === 0) return;
    const tableMoves: Array<{ id: string; x: number; y: number }> = [];
    for (const move of moves) {
      const item = itemsByIdRef.current.get(move.id);
      if (!item) continue;
      setItemPosition(item.kind, move.id, move.x, move.y);
      if (item.kind === 'table') tableMoves.push(move);
    }
    if (tableMoves.length > 0) persistTablePositions(tableMoves);
    toast.info(`Moved ${moves.length} item${moves.length === 1 ? '' : 's'} back onto the floor plan`);
  }, [canvasSize, persistTablePositions, setItemPosition, toast]);

  /* ---- keyboard ------------------------------------------------------------- */

  const nudgeSelection = useCallback(
    (dx: number, dy: number) => {
      if (lockedRef.current || selectedItems.size === 0) return;
      const items = canvasItemsRef.current.filter((item) => selectedItems.has(item.id));
      if (items.length === 0) return;

      const now = Date.now();
      if (now - lastNudgeRef.current > NUDGE_COALESCE_MS) pushHistory();
      lastNudgeRef.current = now;

      const limited = clampGroupDelta(items, dx, dy, canvasSizeRef.current);
      const tableMoves: Array<{ id: string; x: number; y: number }> = [];
      for (const item of items) {
        const x = item.x + limited.x;
        const y = item.y + limited.y;
        setItemPosition(item.kind, item.id, x, y);
        if (item.kind === 'table') tableMoves.push({ id: item.id, x, y });
      }
      if (tableMoves.length > 0) persistTablePositions(tableMoves);
    },
    [persistTablePositions, pushHistory, selectedItems, setItemPosition]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isEditableTarget(e.target)) {
        spaceHeldRef.current = true;
        return;
      }
      // Typing must never trigger a shortcut. The old guard only checked for
      // input and textarea, so a keystroke in a label toggled the grid.
      if (isEditableTarget(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }

      const modifier = e.ctrlKey || e.metaKey;
      const step = e.shiftKey ? 10 : 1;

      if (modifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (modifier && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedItems(new Set(canvasItemsRef.current.map((item) => item.id)));
        return;
      }
      if (modifier && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const item = canvasItemsRef.current.find((candidate) => selectedItems.has(candidate.id));
        if (item) duplicateItem(item);
        return;
      }
      if (modifier) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nudgeSelection(-step, 0);
          return;
        case 'ArrowRight':
          e.preventDefault();
          nudgeSelection(step, 0);
          return;
        case 'ArrowUp':
          e.preventDefault();
          nudgeSelection(0, -step);
          return;
        case 'ArrowDown':
          e.preventDefault();
          nudgeSelection(0, step);
          return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          setShowGrid((prev) => !prev);
          break;
        case 's':
          setSnapToGrid((prev) => !prev);
          break;
        case 'v':
          setTool('select');
          break;
        case 'h':
          setTool('pan');
          break;
        case 'delete':
        case 'backspace':
          if (selectedItems.size > 0 && !locked) {
            e.preventDefault();
            deleteSelection(selectedItems);
          }
          break;
        case 'm':
          setShowMiniMap((prev) => !prev);
          break;
        case 'f':
          fitToView();
          break;
        case 'escape':
          clearSelection();
          endGesture();
          break;
        case 'l':
          setLocked((prev) => !prev);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceHeldRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    clearSelection,
    deleteSelection,
    duplicateItem,
    endGesture,
    fitToView,
    locked,
    nudgeSelection,
    redo,
    selectedItems,
    undo,
  ]);

  // Close a toolbar menu on an outside click.
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  /* ---- export ---------------------------------------------------------------- */

  const exportToExcel = useCallback(async () => {
    try {
      const excelData: (string | number)[][] = [];
      excelData.push(['Table Name', 'Table Shape', 'Capacity', 'Seats Used', 'Guest Name', 'Party Size', 'Phone Number', 'Address']);

      const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));

      sortedTables.forEach((table) => {
        const seatsUsed = table.guests.reduce((total, guest) => total + (guest.partySize || 1), 0);

        if (table.guests.length === 0) {
          excelData.push([safeCell(table.name), safeCell(table.shape), table.capacity, 0, '(No guests assigned)', '', '', '']);
        } else {
          const sortedGuests = [...table.guests].sort((a, b) => a.name.localeCompare(b.name));
          sortedGuests.forEach((guest, index) => {
            excelData.push([
              index === 0 ? safeCell(table.name) : '',
              index === 0 ? safeCell(table.shape) : '',
              index === 0 ? table.capacity : '',
              index === 0 ? seatsUsed : '',
              safeCell(guest.name),
              guest.partySize || 1,
              safeCell(guest.phoneNumber),
              safeCell(guest.address),
            ]);
          });
        }
      });

      if (unassignedGuests.length > 0) {
        excelData.push([]);
        excelData.push(['UNASSIGNED GUESTS', '', '', '', '', '', '', '']);
        const sortedUnassigned = [...unassignedGuests].sort((a, b) => a.name.localeCompare(b.name));
        sortedUnassigned.forEach((guest) => {
          excelData.push(['', '', '', '', safeCell(guest.name), guest.partySize || 1, safeCell(guest.phoneNumber), safeCell(guest.address)]);
        });
      }

      // Loaded on demand: ~400kB that only the export button needs.
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 25 },
        { wch: 12 },
        { wch: 15 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Seating Chart');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `seating-chart-${date}.xlsx`);
      toast.success('Seating chart exported to Excel');
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  }, [tables, unassignedGuests, toast]);

  /* ---- derived render values --------------------------------------------- */

  const totalSeats = useMemo(() => tables.reduce((sum, t) => sum + t.capacity, 0), [tables]);
  const seatedGuests = useMemo(
    () => tables.reduce((sum, t) => sum + t.guests.reduce((inner, g) => inner + (g.partySize || 1), 0), 0),
    [tables]
  );

  const selectedItem = selectedCanvasItems.length > 0 ? selectedCanvasItems[0] : null;
  const inspectorTable =
    selectedCanvasItems.length === 1 && selectedItem?.kind === 'table'
      ? tables.find((t) => t.id === selectedItem.id) ?? null
      : null;
  const inspectorLabel =
    selectedCanvasItems.length === 1 && selectedItem?.kind === 'label'
      ? labels.find((l) => l.id === selectedItem.id) ?? null
      : null;
  const inspectorShape =
    selectedCanvasItems.length === 1 && selectedItem?.kind === 'shape'
      ? shapes.find((s) => s.id === selectedItem.id) ?? null
      : null;
  const inspectorObject =
    selectedCanvasItems.length === 1 && selectedItem?.kind === 'ref'
      ? referenceObjects.find((r) => r.id === selectedItem.id) ?? null
      : null;

  // `pointer-coarse` rather than a width breakpoint: a tablet is finger-driven
  // at 768px wide, where every `sm:` rule has already relaxed to desktop sizing.
  const toolbarButton = (active: boolean) =>
    cn(
      'flex items-center justify-center gap-1 rounded px-3 py-1 text-sm',
      'pointer-coarse:min-h-11',
      active ? themeConfig.button.primary : themeConfig.button.secondary
    );

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div
          className={`mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent ${themeConfig.classes.borderPrimary}`}
        />
        <p className={themeConfig.text.body}>Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* The sticky header already names the active tab on phones. */}
        <div className="hidden md:block">
          <h2 className={`text-xl sm:text-2xl ${themeConfig.text.heading}`}>Seating Chart</h2>
          <p className={`text-sm ${themeConfig.text.muted}`}>
            {tables.length} table{tables.length === 1 ? '' : 's'} · {seatedGuests}/{totalSeats} seats filled ·{' '}
            {unassignedGuests.length} guest{unassignedGuests.length === 1 ? '' : 's'} still to seat
          </p>
        </div>
        {/* Two columns on phones: four full-width buttons stacked would push
            the floor plan off the first screen. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:gap-2">
          <button
            onClick={savePreferences}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.secondary}`}
            title="Save layout"
          >
            <Save className="h-4 w-4" />
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Layout</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={tables.length === 0}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.secondary} disabled:cursor-not-allowed disabled:opacity-50`}
            title="Export seating chart to Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">Export to Excel</span>
          </button>

          <div className="relative" ref={openMenu === 'arrange' ? menuRef : undefined}>
            <button
              onClick={() => setOpenMenu(openMenu === 'arrange' ? null : 'arrange')}
              disabled={tables.length === 0 || locked}
              aria-expanded={openMenu === 'arrange'}
              className={`inline-flex w-full items-center justify-center gap-2 ${themeConfig.button.secondary} disabled:cursor-not-allowed disabled:opacity-50`}
              title="Arrange every table automatically"
            >
              <Shuffle className="h-4 w-4" />
              <span className="sm:hidden">Arrange</span>
              <span className="hidden sm:inline">Auto Arrange</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {openMenu === 'arrange' && (
              <div className="absolute right-0 z-50 mt-1 w-60 rounded-lg border-2 border-stone-300 bg-white shadow-xl">
                {ARRANGE_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => handleAutoArrange(layout.id)}
                    className="block w-full px-4 py-2 text-left text-sm text-stone-800 transition-colors hover:bg-stone-100"
                  >
                    <span className="font-medium">{layout.label}</span>
                    <span className="block text-xs text-stone-500">{layout.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setShowAddTable(true)} className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.primary}`}>
            <Plus className="h-4 w-4" />
            Add Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        {/* Unassigned Guests. Collapsible on phones so the floor plan is not
            pushed below a long list. */}
        <div className={`lg:col-span-1 ${themeConfig.card}`}>
          <button
            type="button"
            onClick={() => setShowGuestPanel((open) => !open)}
            aria-expanded={showGuestPanel}
            className={`flex w-full items-center justify-between gap-2 font-semibold ${themeConfig.text.heading} lg:cursor-default`}
          >
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Unassigned Guests ({unassignedGuests.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-stone-400 transition-transform lg:hidden ${showGuestPanel ? 'rotate-180' : ''}`}
            />
          </button>

          <div className={`${showGuestPanel ? 'block' : 'hidden'} lg:block`}>
            <div className="mb-4 mt-4">
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform ${themeConfig.icon.color.secondary}`}
                />
                <input
                  type="text"
                  placeholder="Search guests..."
                  value={guestSearchTerm}
                  onChange={(e) => setGuestSearchTerm(e.target.value)}
                  className={`w-full rounded-lg py-2 pl-9 pr-3 ${themeConfig.input}`}
                />
              </div>
            </div>

            {isTouch && (
              <p className={`mb-2 text-xs ${themeConfig.text.muted}`}>Tap a guest to seat them at a table.</p>
            )}

            <div className="max-h-[45vh] space-y-2 overflow-y-auto overscroll-contain lg:max-h-96">
              {filteredGuests.map((guest) => (
                <DraggableGuest
                  key={guest.id}
                  guest={guest}
                  onUnassign={() => handleUnassignGuest(guest.id)}
                  onSeat={() => setSeatingGuest(guest)}
                />
              ))}
              {filteredGuests.length === 0 && unassignedGuests.length > 0 && (
                <p className={`text-sm ${themeConfig.text.body}`}>
                  No guests found matching &ldquo;{guestSearchTerm}&rdquo;
                </p>
              )}
              {unassignedGuests.length === 0 && (
                <p className={`text-sm ${themeConfig.text.body}`}>All guests are assigned!</p>
              )}
            </div>
          </div>
        </div>

        {/* Seating Chart Canvas */}
        <div className={`lg:col-span-3 ${themeConfig.card}`}>
          <div className="mb-4 space-y-3">
            {/* Always-visible row: view controls, even on phones. */}
            <div className={`flex flex-wrap items-center gap-2 rounded-lg p-2 ${themeConfig.theme.secondary[100]}`}>
              <div className="flex overflow-hidden rounded border-2 border-stone-500">
                <button
                  onClick={() => setTool('select')}
                  aria-pressed={tool === 'select'}
                  title="Select tool (V) — drag to select several items"
                  className={cn(
                    'flex items-center justify-center px-3 py-1.5 transition-colors',
                    'pointer-coarse:min-h-11 pointer-coarse:min-w-11',
                    tool === 'select' ? 'bg-emerald-600 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
                  )}
                >
                  <MousePointer2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTool('pan')}
                  aria-pressed={tool === 'pan'}
                  title="Pan tool (H) — or hold Space with the select tool"
                  className={cn(
                    'flex items-center justify-center px-3 py-1.5 transition-colors',
                    'pointer-coarse:min-h-11 pointer-coarse:min-w-11',
                    tool === 'pan' ? 'bg-emerald-600 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
                  )}
                >
                  <Hand className="h-4 w-4" />
                </button>
              </div>

              <button onClick={() => zoomBy(1 / 1.2)} className={toolbarButton(false)} title="Zoom out" aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className={`min-w-[3rem] text-center text-sm font-medium ${themeConfig.text.body}`}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button onClick={() => zoomBy(1.2)} className={toolbarButton(false)} title="Zoom in" aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={fitToView} className={toolbarButton(false)} title="Fit floor plan to view (F)" aria-label="Fit floor plan to view">
                <Maximize className="h-4 w-4" />
              </button>

              <div className="mx-1 hidden h-6 w-px bg-stone-300 md:block" />

              <button
                onClick={undo}
                disabled={!canUndo}
                className={cn(toolbarButton(false), 'disabled:opacity-40')}
                title="Undo (Ctrl/⌘+Z)"
                aria-label="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={cn(toolbarButton(false), 'disabled:opacity-40')}
                title="Redo (Ctrl/⌘+Shift+Z)"
                aria-label="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </button>

              <button
                onClick={() => setLocked((prev) => !prev)}
                className={toolbarButton(locked)}
                title={locked ? 'Unlock the floor plan for editing' : 'Lock the floor plan so nothing moves'}
                aria-pressed={locked}
              >
                {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                <span className="hidden sm:inline">{locked ? 'Locked' : 'Unlocked'}</span>
              </button>

              {/* The rest of the toolbar is a lot of controls for a phone, so
                  it hides behind this toggle below `md`. */}
              <button
                onClick={() => setShowTools((open) => !open)}
                aria-expanded={showTools}
                className={cn(toolbarButton(showTools), 'ml-auto md:hidden')}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Tools
              </button>

              <div className={`ml-auto hidden items-center gap-1 text-xs md:flex ${themeConfig.text.muted}`}>
                <Move className="h-3.5 w-3.5" />
                <span>Space or middle-drag pans · Ctrl/⌘+scroll zooms</span>
              </div>
            </div>

            {/* Editing tools. On a phone this is an opt-in drawer, so it is
                capped and scrolls rather than pushing the floor plan off the
                first screen; from `md` up it is just a toolbar row again. */}
            <div
              className={cn(
                showTools ? 'flex' : 'hidden',
                'max-h-[38vh] flex-wrap items-center gap-2 overflow-y-auto overscroll-contain',
                'md:flex md:max-h-none md:overflow-visible'
              )}
            >
              <button onClick={() => setShowGrid(!showGrid)} className={toolbarButton(showGrid)} title="Toggle grid (G)">
                <GridIcon className="h-4 w-4" />
                Grid
              </button>
              <button onClick={() => setSnapToGrid(!snapToGrid)} className={toolbarButton(snapToGrid)} title="Snap to grid (S)">
                <Move className="h-4 w-4" />
                Snap
              </button>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                aria-label="Grid size"
                /* `themeConfig.input` is w-full, which made this select claim a
                   whole toolbar row on its own. */
                className={cn(themeConfig.input, 'w-auto px-2 py-1 text-sm pointer-coarse:min-h-11')}
              >
                <option value={10}>10px Grid</option>
                <option value={20}>20px Grid</option>
                <option value={50}>50px Grid</option>
                <option value={100}>100px Grid</option>
              </select>
              <button
                onClick={() => setSmartGuides(!smartGuides)}
                className={toolbarButton(smartGuides)}
                title="Line items up with their neighbours while dragging"
              >
                <AlignCenter className="h-4 w-4" />
                Guides
              </button>

              {/* Edit zone size. Committed on blur/Enter so typing "1" of
                  "1200" is not clamped away mid-keystroke. */}
              <div className="flex items-center gap-1 text-sm">
                <span className={themeConfig.text.body}>Floor</span>
                <input
                  key={`floor-w-${canvasSize.width}`}
                  type="number"
                  min={CANVAS_MIN}
                  max={CANVAS_MAX}
                  step={100}
                  defaultValue={canvasSize.width}
                  disabled={locked}
                  aria-label="Floor plan width in pixels"
                  onBlur={(e) =>
                    setCanvasSize((prev) => ({ ...prev, width: clampCanvasValue(Number(e.target.value) || prev.width) }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className={cn(themeConfig.input, 'w-20 px-2 py-1 text-sm pointer-coarse:min-h-11 disabled:opacity-50')}
                />
                <span className={themeConfig.text.body}>×</span>
                <input
                  key={`floor-h-${canvasSize.height}`}
                  type="number"
                  min={CANVAS_MIN}
                  max={CANVAS_MAX}
                  step={100}
                  defaultValue={canvasSize.height}
                  disabled={locked}
                  aria-label="Floor plan height in pixels"
                  onBlur={(e) =>
                    setCanvasSize((prev) => ({ ...prev, height: clampCanvasValue(Number(e.target.value) || prev.height) }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className={cn(themeConfig.input, 'w-20 px-2 py-1 text-sm pointer-coarse:min-h-11 disabled:opacity-50')}
                />
              </div>

              <div className="mx-1 hidden h-6 w-px bg-stone-300 md:block" />

              {/* Labels: a plain add, plus the captions every event reuses. */}
              <div className="relative flex" ref={openMenu === 'label' ? menuRef : undefined}>
                <button
                  onClick={() => addLabel('New Label')}
                  disabled={locked}
                  className={cn(toolbarButton(false), 'rounded-r-none disabled:opacity-50')}
                  title="Add a label and start typing"
                >
                  <Type className="h-4 w-4" />
                  Label
                </button>
                <button
                  onClick={() => setOpenMenu(openMenu === 'label' ? null : 'label')}
                  disabled={locked}
                  aria-label="Label presets"
                  aria-expanded={openMenu === 'label'}
                  className={cn(toolbarButton(false), 'rounded-l-none border-l-0 px-2 disabled:opacity-50')}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                {openMenu === 'label' && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border-2 border-stone-300 bg-white shadow-xl">
                    {LABEL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => addLabel(preset)}
                        className="block w-full px-4 py-2 text-left text-sm text-stone-800 transition-colors hover:bg-stone-100"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => addShape('rectangle')} disabled={locked} className={cn(toolbarButton(false), 'disabled:opacity-50')} title="Add rectangle">
                <Square className="h-4 w-4" />
                Rectangle
              </button>
              <button onClick={() => addShape('circle')} disabled={locked} className={cn(toolbarButton(false), 'disabled:opacity-50')} title="Add circle">
                <Circle className="h-4 w-4" />
                Circle
              </button>
              <button onClick={() => addShape('line')} disabled={locked} className={cn(toolbarButton(false), 'disabled:opacity-50')} title="Add line">
                <Minus className="h-4 w-4" />
                Line
              </button>

              <div className="relative" ref={openMenu === 'object' ? menuRef : undefined}>
                <button
                  onClick={() => setOpenMenu(openMenu === 'object' ? null : 'object')}
                  disabled={locked}
                  aria-expanded={openMenu === 'object'}
                  className={cn(toolbarButton(false), 'disabled:opacity-50')}
                  title="Add a venue feature"
                >
                  <MapIcon className="h-4 w-4" />
                  Add Object
                  <ChevronDown className="h-3 w-3" />
                </button>
                {openMenu === 'object' && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border-2 border-stone-300 bg-white shadow-xl">
                    {REFERENCE_OBJECT_TYPES.map((type) => {
                      const Icon = REFERENCE_OBJECT_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => addReferenceObject(type)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-stone-800 transition-colors hover:bg-stone-100"
                        >
                          <Icon className="h-4 w-4" />
                          {REFERENCE_OBJECT_DEFAULTS[type].label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mx-1 hidden h-6 w-px bg-stone-300 md:block" />

              {/* Alignment now works on every kind of item, not just tables —
                  but it needs a multi-selection, and the marquee that makes one
                  is a pointer gesture, so this stays off phones. */}
              <div className="hidden items-center gap-1 md:flex">
                {(
                  [
                    { mode: 'left', icon: AlignLeft, title: 'Align left' },
                    { mode: 'centerX', icon: AlignCenter, title: 'Align centres horizontally' },
                    { mode: 'right', icon: AlignRight, title: 'Align right' },
                    { mode: 'top', icon: AlignStartHorizontal, title: 'Align top' },
                    { mode: 'bottom', icon: AlignEndHorizontal, title: 'Align bottom' },
                  ] as Array<{ mode: AlignMode; icon: typeof AlignLeft; title: string }>
                ).map(({ mode, icon: Icon, title }) => (
                  <button
                    key={mode}
                    onClick={() => handleAlign(mode)}
                    disabled={selectedItems.size < 2 || locked}
                    className={cn(toolbarButton(false), 'px-2 disabled:opacity-40')}
                    title={title}
                    aria-label={title}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  onClick={() => handleDistribute('horizontal')}
                  disabled={selectedItems.size < 3 || locked}
                  className={cn(toolbarButton(false), 'px-2 disabled:opacity-40')}
                  title="Space evenly across"
                  aria-label="Distribute horizontally"
                >
                  <AlignHorizontalSpaceAround className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDistribute('vertical')}
                  disabled={selectedItems.size < 3 || locked}
                  className={cn(toolbarButton(false), 'px-2 disabled:opacity-40')}
                  title="Space evenly down"
                  aria-label="Distribute vertically"
                >
                  <AlignVerticalSpaceAround className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => deleteSelection(selectedItems)}
                disabled={selectedItems.size === 0 || locked}
                className={cn(
                  'flex items-center justify-center gap-1 rounded px-2 py-1 text-sm',
                  'pointer-coarse:min-h-11',
                  themeConfig.button.danger,
                  'disabled:opacity-40'
                )}
                title="Delete selected (Del)"
                aria-label="Delete selected items"
              >
                <Trash2 className="h-4 w-4" />
                <span className="md:hidden">Delete</span>
              </button>

              <div className="mx-1 hidden h-6 w-px bg-stone-300 md:block" />

              <button onClick={() => setShowMiniMap(!showMiniMap)} className={toolbarButton(showMiniMap)} title="Toggle mini-map (M)">
                <MapIcon className="h-4 w-4" />
                Mini-map
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={chartRef}
            className={cn(
              'relative h-[min(62vh,760px)] min-h-[340px] overflow-hidden rounded-lg border-2 border-dashed bg-stone-200/60 md:h-[min(72vh,760px)] md:min-h-[480px]',
              activeGesture === 'pan' ? 'cursor-grabbing' : tool === 'pan' || locked ? 'cursor-grab' : 'cursor-default'
            )}
            /* Fixed viewport onto the floor plan: the inner surface keeps its
               unscaled layout size, so without an explicit height the container
               stretched to the full canvas and left dead space below.
               `touch-action: none` hands drags and pinches to the gesture
               handlers instead of scrolling the page. */
            style={{ touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              ref={canvasRef}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '0 0',
                // Explicit floor-plan surface. Previously 100%/100%, which under
                // scale() left dead background that still accepted drops.
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                position: 'relative',
                background: '#ffffff',
                boxShadow: '0 0 0 1px rgba(120,113,108,.25)',
                // Any live gesture must track the pointer exactly; only
                // button-driven zooms get the easing.
                transition: activeGesture ? 'none' : 'transform 120ms ease-out',
              }}
            >
              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #d4d4d8 1px, transparent 1px),
                      linear-gradient(to bottom, #d4d4d8 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    opacity: 0.4,
                  }}
                />
              )}

              {/* Shapes */}
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  onPointerDown={(e) => startItemDrag('shape', shape.id, e)}
                  className={cn('absolute', locked ? 'cursor-default' : 'cursor-move')}
                  style={{
                    left: shape.x,
                    top: shape.y,
                    width: shape.width,
                    height: shape.height,
                    backgroundColor: shape.color,
                    opacity: undefined,
                    borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'line' ? '4px' : '12px',
                    border:
                      shape.borderStyle === 'none' ? 'none' : `2px ${shape.borderStyle} ${shape.borderColor}`,
                    transform: `rotate(${shape.rotation || 0}deg)`,
                    transformOrigin: 'center',
                    zIndex: LAYER.shape,
                  }}
                >
                  {/* The fill carries the opacity, so a caption stays readable
                      over a barely-there zone. */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundColor: shape.color,
                      opacity: shape.opacity,
                      borderRadius: 'inherit',
                    }}
                  />
                  {shape.label && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center text-sm font-semibold text-stone-800">
                      {shape.label}
                    </div>
                  )}
                </div>
              ))}

              {/* Reference objects */}
              {referenceObjects.map((object) => {
                const { label, palette } = resolveReferenceObject(object);
                const Icon = REFERENCE_OBJECT_ICONS[object.type] ?? REFERENCE_OBJECT_ICONS.danceFloor;
                const compact = Math.min(object.width, object.height) < 70;
                return (
                  <div
                    key={object.id}
                    onPointerDown={(e) => startItemDrag('ref', object.id, e)}
                    className={cn(
                      'absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-dashed px-1 text-center text-xs font-semibold',
                      locked ? 'cursor-default' : 'cursor-move'
                    )}
                    style={{
                      left: object.x,
                      top: object.y,
                      width: object.width,
                      height: object.height,
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      color: palette.text,
                      transform: `rotate(${object.rotation || 0}deg)`,
                      transformOrigin: 'center',
                      zIndex: LAYER.ref,
                    }}
                  >
                    <Icon className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
                    {!compact && <span className="leading-tight">{label}</span>}
                  </div>
                );
              })}

              {/* Labels. The editable text is its own node with no controls
                  inside it: nesting the toolbar in the contenteditable used to
                  append the button captions to the label on blur. */}
              {labels.map((label) => {
                const editing = editingLabelId === label.id;
                const backdrop =
                  label.background === 'none'
                    ? 'transparent'
                    : label.background === 'solid'
                      ? '#ffffff'
                      : 'rgba(255,255,255,0.72)';
                // While editing, never render smaller than legible: a 20px
                // label on a plan zoomed to 20% is 4px on screen, and you
                // cannot see the caret, let alone what you are typing. At a
                // normal zoom this is 1 and the label edits in place, as it
                // should.
                const editScale = editing
                  ? Math.max(1, 15 / Math.max(1, label.fontSize * zoomLevel))
                  : 1;
                return (
                  <div
                    key={label.id}
                    ref={(el) => {
                      if (el) labelElements.current.set(label.id, el);
                      else labelElements.current.delete(label.id);
                    }}
                    onPointerDown={(e) => {
                      if (editing) {
                        e.stopPropagation();
                        return;
                      }
                      startItemDrag('label', label.id, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!locked) setEditingLabelId(label.id);
                    }}
                    className={cn(
                      'absolute max-w-[80%] whitespace-pre-wrap rounded px-2 py-0.5 leading-tight',
                      locked ? 'cursor-default' : editing ? 'cursor-text' : 'cursor-move',
                      editing && 'outline outline-2 outline-emerald-500'
                    )}
                    style={{
                      left: label.x,
                      top: label.y,
                      fontSize: label.fontSize,
                      fontWeight: label.bold ? 700 : 400,
                      color: label.color,
                      textAlign: label.align,
                      backgroundColor: backdrop,
                      transform: `rotate(${label.rotation || 0}deg)${editScale !== 1 ? ` scale(${editScale})` : ''}`,
                      transformOrigin: 'center',
                      zIndex: editing ? LAYER.marquee : LAYER.label,
                      outlineOffset: 2,
                    }}
                    contentEditable={editing}
                    suppressContentEditableWarning
                    title={locked ? undefined : 'Double-click to edit'}
                    onBlur={(e) => {
                      if (!editing) return;
                      const text = (e.currentTarget.textContent || '').trim() || 'Label';
                      setEditingLabelId(null);
                      if (text !== label.text) {
                        pushHistory();
                        updateLabel(label.id, { text });
                      } else {
                        // Put the DOM back exactly as React believes it to be.
                        e.currentTarget.textContent = label.text;
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!editing) return;
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.currentTarget.textContent = label.text;
                        e.currentTarget.blur();
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  >
                    {label.text}
                  </div>
                );
              })}

              {/* Tables */}
              {tables.map((table) => (
                <DraggableTable
                  key={table.id}
                  table={table}
                  onAssignGuest={handleAssignGuest}
                  onUnassignGuest={handleUnassignGuest}
                  onRename={handleRenameTable}
                  allTableNames={tables.map((t) => t.name)}
                  onDragStart={handleTableDragStart}
                  isDragging={draggingIds.has(table.id)}
                  isSelected={selectedItems.has(table.id)}
                  locked={locked}
                  onSeatGuest={setSeatingGuest}
                  zoom={zoomLevel}
                />
              ))}

              {/* Alignment guides */}
              {guides.map((guide) => (
                <div
                  key={`${guide.axis}-${guide.position}`}
                  className="pointer-events-none absolute bg-rose-400"
                  style={{
                    zIndex: LAYER.guide,
                    ...(guide.axis === 'x'
                      ? { left: guide.position, top: 0, width: 1 / zoomLevel, height: canvasSize.height }
                      : { top: guide.position, left: 0, height: 1 / zoomLevel, width: canvasSize.width }),
                  }}
                />
              ))}

              {/* Marquee */}
              {marquee && (
                <div
                  className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-500/10"
                  style={{
                    left: marquee.x,
                    top: marquee.y,
                    width: marquee.width,
                    height: marquee.height,
                    zIndex: LAYER.marquee,
                  }}
                />
              )}

              <SelectionOverlay
                items={selectedCanvasItems}
                zoom={zoomLevel}
                locked={locked}
                touch={isTouch}
                canvasSize={canvasSize}
                onResizeStart={startResize}
                onRotateStart={startRotate}
                onDelete={(item) => deleteSelection(new Set([item.id]))}
                onDuplicate={duplicateItem}
              />

              {tables.length === 0 && labels.length === 0 && shapes.length === 0 && referenceObjects.length === 0 && (
                <div className={`absolute inset-0 flex items-center justify-center ${themeConfig.empty.container}`}>
                  <div className="text-center">
                    <GridIcon className={`mx-auto mb-4 h-12 w-12 opacity-50 ${themeConfig.empty.icon}`} />
                    <p className={themeConfig.empty.text}>
                      No tables yet. Click &ldquo;Add Table&rdquo; to get started.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Inspector
              item={selectedItem}
              selectionCount={selectedCanvasItems.length}
              table={inspectorTable}
              label={inspectorLabel}
              shape={inspectorShape}
              referenceObject={inspectorObject}
              locked={locked}
              tableNames={tables.map((t) => t.name)}
              tableGuests={inspectorTable?.guests ?? []}
              onUnassignGuest={handleUnassignGuest}
              onUpdateTable={updateTable}
              onUpdateLabel={(id, patch) => {
                pushHistory();
                updateLabel(id, patch);
              }}
              onUpdateShape={(id, patch) => {
                pushHistory();
                updateShape(id, patch);
              }}
              onUpdateReferenceObject={(id, patch) => {
                pushHistory();
                updateReferenceObject(id, patch);
              }}
              onDelete={(item) => deleteSelection(new Set([item.id]))}
              onDuplicate={duplicateItem}
              onClose={clearSelection}
            />

            {showMiniMap && canvasItems.length > 0 && (
              <MiniMap
                items={canvasItems}
                canvasSize={canvasSize}
                viewport={viewport}
                selectedIds={selectedItems}
                onNavigate={centreOn}
              />
            )}
          </div>

          {/* Helper Text */}
          <p className={`mt-3 text-xs md:hidden ${themeConfig.text.muted}`}>
            Drag the floor plan to pan, pinch to zoom, and drag a table to move it. Tap an item to
            select it — resize, rotate and styling controls appear around it. Tap a table&rsquo;s name
            to rename it or its seat count to see who is sitting there.
          </p>
          <div className="mt-3 hidden space-y-1 text-xs text-stone-800 md:block">
            <p>
              • <strong>Select:</strong> Click an item, Shift+Click to add, or drag a box around
              several. Ctrl/⌘+A selects everything.
            </p>
            <p>
              • <strong>Edit:</strong> Handles around a selection resize it (Shift keeps the
              proportions) and rotate it (Shift snaps to 15°). The panel on the right sets size,
              colour and text exactly.
            </p>
            <p>
              • <strong>Move:</strong> Drag a selection, or nudge it with the arrow keys (Shift for
              10px). Guides line items up with their neighbours; grid snapping overrides them.
            </p>
            <p>
              • <strong>Navigate:</strong> Space or middle-drag pans, Ctrl/⌘+scroll zooms at the
              cursor, F frames the plan, and the mini-map jumps the view anywhere.
            </p>
            <p>
              • <strong>Labels:</strong> Double-click one to retype it. The chevron beside Label
              offers the captions most events reuse.
            </p>
            <p>
              • <strong>Undo:</strong> Ctrl/⌘+Z and Ctrl/⌘+Shift+Z cover layout changes. Adding or
              deleting a table, and seating a guest, are not undone.
            </p>
            <p>
              • <strong>Keyboard:</strong> V/H (tools), G (grid), S (snap), M (mini-map), F (fit), L
              (lock), Ctrl/⌘+D (duplicate), Delete, Esc
            </p>
          </div>
        </div>
      </div>

      {seatingGuest && (
        <MoveGuestsDialog
          guests={[seatingGuest]}
          tables={tables}
          onAssign={(tableId) => {
            if (tableId) handleAssignGuest(seatingGuest.id, tableId);
            else handleUnassignGuest(seatingGuest.id);
            setSeatingGuest(null);
          }}
          onClose={() => setSeatingGuest(null)}
        />
      )}

      {/* Add Table Modal */}
      {showAddTable && (
        <div className={themeConfig.modal.overlay} onClick={() => setShowAddTable(false)}>
          <div className={themeConfig.modal.container} onClick={(e) => e.stopPropagation()}>
            <h3 className={themeConfig.modal.title}>Add New Table</h3>
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className={`block ${themeConfig.text.label} mb-1`} htmlFor="new-table-name">
                  Table Name
                </label>
                <input
                  id="new-table-name"
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="e.g., Table 1, Head Table, etc."
                  maxLength={50}
                  className={themeConfig.input}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`} htmlFor="new-table-shape">
                  Table Shape
                </label>
                <select
                  id="new-table-shape"
                  value={newTable.shape}
                  onChange={(e) => {
                    const shape = e.target.value;
                    if (!isTableShape(shape)) return;
                    setNewTable({ ...newTable, shape, capacity: DEFAULT_TABLE_CAPACITY[shape] });
                  }}
                  className={themeConfig.input}
                >
                  {TABLE_SHAPES.map((shape) => (
                    <option key={shape} value={shape}>
                      {TABLE_SHAPE_LABELS[shape]} Table
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`} htmlFor="new-table-capacity">
                  Capacity
                </label>
                <input
                  id="new-table-capacity"
                  type="number"
                  min={1}
                  max={TABLE_CAPACITY_MAX}
                  value={newTable.capacity}
                  onChange={(e) =>
                    setNewTable({
                      ...newTable,
                      capacity: Math.max(1, Math.min(TABLE_CAPACITY_MAX, parseInt(e.target.value, 10) || 1)),
                    })
                  }
                  className={themeConfig.input}
                  required
                />
                <p className={`mt-1 text-xs ${themeConfig.text.muted}`}>
                  Seats can be changed later, and the table resized, from the panel beside the floor
                  plan.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3 sm:pt-4">
                <button type="submit" className={`flex-1 ${themeConfig.button.primary}`}>
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTable(false)}
                  className={`flex-1 sm:flex-none ${themeConfig.button.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
