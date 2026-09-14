'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_MAX,
  CANVAS_MIN,
  CANVAS_WIDTH,
  clampBox,
  clampToCanvas,
  fetchSeating,
  getTableDimensions,
  persistAssignment,
  safeCell,
  seatsAvailable,
  type CanvasSize,
} from '@/lib/seating';
import {
  Plus,
  Users,
  Grid as GridIcon,
  ZoomIn,
  ZoomOut,
  Move,
  Shuffle,
  Search,
  Type,
  Square,
  Circle,
  Minus,
  MapPin,
  Wine,
  Cake,
  Gift,
  DoorOpen,
  Music,
  Utensils,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  Trash2,
  Map,
  Save,
  RotateCw,
  LucideIcon,
  FileSpreadsheet,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  Unlock,
  Maximize,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsTouch } from '@/hooks/useMediaQuery';
import { useToast } from '@/contexts/ToastContext';
import DraggableTable from './DraggableTable';
import DraggableGuest from './DraggableGuest';
import AssignGuestSheet from './AssignGuestSheet';

interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  rotation: number;
  guests: Guest[];
}

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
  tableId: string | null;
}

interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
}

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label?: string;
}

interface ReferenceObject {
  id: string;
  type: 'danceFloor' | 'bar' | 'buffet' | 'cake' | 'gift' | 'entrance' | 'stage';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const REFERENCE_OBJECT_CONFIGS: Record<string, { width: number; height: number; label: string; color: string; icon: LucideIcon }> = {
  danceFloor: { width: 200, height: 200, label: 'Dance Floor', color: 'bg-purple-200 border-purple-400', icon: Music },
  bar: { width: 150, height: 80, label: 'Bar', color: 'bg-blue-200 border-blue-400', icon: Wine },
  buffet: { width: 180, height: 60, label: 'Buffet', color: 'bg-orange-200 border-orange-400', icon: Utensils },
  cake: { width: 80, height: 80, label: 'Cake Table', color: 'bg-pink-200 border-pink-400', icon: Cake },
  gift: { width: 80, height: 80, label: 'Gift Table', color: 'bg-yellow-200 border-yellow-400', icon: Gift },
  entrance: { width: 100, height: 40, label: 'Entrance', color: 'bg-green-200 border-green-400', icon: DoorOpen },
  stage: { width: 200, height: 100, label: 'Stage', color: 'bg-indigo-200 border-indigo-400', icon: MapPin },
};

const clampCanvasValue = (value: number) =>
  Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(value)));

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

/** Everything the canvas can move. One drag path for all of them. */
type DragKind = 'table' | 'label' | 'shape' | 'ref';

interface DragState {
  kind: DragKind;
  id: string;
  /** Last pointer position, in screen px. */
  pointerX: number;
  pointerY: number;
  /** Where the gesture started, so a click can be told from a drag. */
  originX: number;
  originY: number;
  /** Unsnapped item position. Snapping reads from this, so sub-grid pointer
   *  movement accumulates instead of being thrown away every frame. */
  x: number;
  y: number;
  moved: boolean;
}

export default function SeatingChart() {
  const themeConfig = useTheme();
  const toast = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const debouncedGuestSearchTerm = useDebounce(guestSearchTerm, 300);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    shape: 'round',
    capacity: 8,
  });

  // Enhanced features state
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  const [labels, setLabels] = useState<Label[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [referenceObjects, setReferenceObjects] = useState<ReferenceObject[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMiniMap, setShowMiniMap] = useState(true);
  // The edit zone: a floor plan of a fixed, configurable size that can be
  // locked so a stray drag cannot move anything.
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [locked, setLocked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingItem, setResizingItem] = useState<{ type: 'shape' | 'ref'; id: string; handle: string } | null>(null);
  const [rotatingItem, setRotatingItem] = useState<{ type: 'shape' | 'ref' | 'label'; id: string } | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showObjectDropdown, setShowObjectDropdown] = useState(false);

  const getDefaultCapacity = (shape: string) => {
    const defaults: { [key: string]: number } = {
      round: 8,
      rectangular: 10,
      square: 6,
      oval: 12,
      'u-shape': 16,
      cocktail: 4,
    };
    return defaults[shape] || 8;
  };

  const [loading, setLoading] = useState(true);
  const isTouch = useIsTouch();
  // Mobile-only chrome: the full toolbar and the guest column both collapse so
  // the floor plan itself gets the screen.
  const [showTools, setShowTools] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(true);
  const [seatingGuest, setSeatingGuest] = useState<Guest | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // One gesture model: pointer events cover mouse, pen and touch, so tables,
  // labels, shapes and objects all move through the same code path.
  const dragRef = useRef<DragState | null>(null);
  const panPointerRef = useRef<{ x: number; y: number } | null>(null);
  // Two fingers still need raw touch events: pointer events give one stream
  // per finger, and pinch needs both at once.
  const pinchRef = useRef<{ distance: number; zoom: number; midX: number; midY: number } | null>(null);

  // Mirrors of state so applyAssignment can stay identity-stable while still
  // reading current values (a guest may live in either collection).
  const tablesRef = useRef<Table[]>([]);
  const unassignedGuestsRef = useRef<Guest[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const layoutLoadedRef = useRef(false);
  const lastSavedLayoutRef = useRef<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showObjectDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowObjectDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showObjectDropdown]);

  // Load layout data from database and localStorage preferences
  useEffect(() => {
    const loadLayoutData = async () => {
      try {
        // Load UI preferences from localStorage
        const savedPreferences = localStorage.getItem('seatingChartPreferences');
        if (savedPreferences) {
          const prefs = JSON.parse(savedPreferences);
          if (prefs.showGrid !== undefined) setShowGrid(prefs.showGrid);
          if (prefs.snapToGrid !== undefined) setSnapToGrid(prefs.snapToGrid);
          if (prefs.gridSize !== undefined) setGridSize(prefs.gridSize);
          if (prefs.showMiniMap !== undefined) setShowMiniMap(prefs.showMiniMap);
          if (prefs.locked !== undefined) setLocked(prefs.locked);
          if (prefs.canvasWidth && prefs.canvasHeight) {
            setCanvasSize({
              width: clampCanvasValue(prefs.canvasWidth),
              height: clampCanvasValue(prefs.canvasHeight),
            });
          }
        }

        // Load layout objects from database
        const [labelsRes, shapesRes, objectsRes] = await Promise.all([
          fetch('/api/layout/labels'),
          fetch('/api/layout/shapes'),
          fetch('/api/layout/reference-objects'),
        ]);

        let loadedLabels: Label[] = [];
        let loadedShapes: Shape[] = [];
        let loadedObjects: ReferenceObject[] = [];

        if (labelsRes.ok) {
          const labelsData = await labelsRes.json();
          loadedLabels = labelsData.map((l: { id: string; text: string; x: number; y: number; fontSize?: number; font_size?: number; rotation?: number }) => ({
            id: l.id,
            text: l.text,
            x: l.x,
            y: l.y,
            fontSize: l.fontSize || l.font_size || 16,
            rotation: l.rotation || 0,
          }));
          setLabels(loadedLabels);
        }

        if (shapesRes.ok) {
          const shapesData = await shapesRes.json();
          loadedShapes = shapesData.map((s: { id: string; type: string; x: number; y: number; width: number; height: number; rotation?: number; color: string; label?: string }) => ({
            id: s.id,
            type: s.type,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            rotation: s.rotation || 0,
            color: s.color,
            label: s.label,
          }));
          setShapes(loadedShapes);
        }

        if (objectsRes.ok) {
          const objectsData = await objectsRes.json();
          loadedObjects = objectsData.map((o: { id: string; type: string; x: number; y: number; width: number; height: number; rotation?: number }) => ({
            id: o.id,
            type: o.type,
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            rotation: o.rotation || 0,
          }));
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

  // UI preferences are local-only, so just mirror them as they change.
  useEffect(() => {
    localStorage.setItem(
      'seatingChartPreferences',
      JSON.stringify({
        showGrid,
        snapToGrid,
        gridSize,
        showMiniMap,
        locked,
        canvasWidth: canvasSize.width,
        canvasHeight: canvasSize.height,
      })
    );
  }, [showGrid, snapToGrid, gridSize, showMiniMap, locked, canvasSize]);

  // Layout objects live in the database, so persist them as they change.
  // Without this a delete only survived until the next reload — which is why
  // objects such as the dance floor appeared undeletable.
  const layoutPayload = JSON.stringify({ labels, shapes, referenceObjects });
  const debouncedLayout = useDebounce(layoutPayload, 800);
  useEffect(() => {
    if (!layoutLoadedRef.current) return;
    if (debouncedLayout === lastSavedLayoutRef.current) return;
    lastSavedLayoutRef.current = debouncedLayout;
    const body = debouncedLayout;
    Promise.all([
      fetch('/api/layout/labels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      fetch('/api/layout/shapes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
      fetch('/api/layout/reference-objects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
    ]).catch((error) => console.error('Failed to autosave layout:', error));
  }, [debouncedLayout]);

  // Explicit save. Layout changes autosave anyway; this is the "I am done"
  // button that confirms it.
  const savePreferences = useCallback(async () => {
    try {
      await Promise.all([
        fetch('/api/layout/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labels }),
        }),
        fetch('/api/layout/shapes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shapes }),
        }),
        fetch('/api/layout/reference-objects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referenceObjects }),
        }),
      ]);

      lastSavedLayoutRef.current = JSON.stringify({ labels, shapes, referenceObjects });
      toast.success('Layout saved');
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast.error('Failed to save layout');
    }
  }, [labels, shapes, referenceObjects, toast]);

  // Export seating chart to Excel
  const exportToExcel = useCallback(async () => {
    try {
      // Prepare data for Excel
      const excelData: (string | number)[][] = [];

      // Add header row
      excelData.push(['Table Name', 'Table Shape', 'Capacity', 'Seats Used', 'Guest Name', 'Party Size', 'Phone Number', 'Address']);

      // Sort tables by name
      const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));

      // Add data for each table
      sortedTables.forEach(table => {
        const seatsUsed = table.guests.reduce((total, guest) => total + (guest.partySize || 1), 0);

        if (table.guests.length === 0) {
          // Empty table - show one row
          excelData.push([
            safeCell(table.name),
            safeCell(table.shape),
            table.capacity,
            0,
            '(No guests assigned)',
            '',
            '',
            ''
          ]);
        } else {
          // Sort guests by name
          const sortedGuests = [...table.guests].sort((a, b) => a.name.localeCompare(b.name));

          sortedGuests.forEach((guest, index) => {
            excelData.push([
              index === 0 ? safeCell(table.name) : '', // Only show table info on first guest row
              index === 0 ? safeCell(table.shape) : '',
              index === 0 ? table.capacity : '',
              index === 0 ? seatsUsed : '',
              safeCell(guest.name),
              guest.partySize || 1,
              safeCell(guest.phoneNumber),
              safeCell(guest.address)
            ]);
          });
        }
      });

      // Add unassigned guests if any
      if (unassignedGuests.length > 0) {
        excelData.push([]); // Empty row
        excelData.push(['UNASSIGNED GUESTS', '', '', '', '', '', '', '']);

        const sortedUnassigned = [...unassignedGuests].sort((a, b) => a.name.localeCompare(b.name));
        sortedUnassigned.forEach(guest => {
          excelData.push([
            '',
            '',
            '',
            '',
            safeCell(guest.name),
            guest.partySize || 1,
            safeCell(guest.phoneNumber),
            safeCell(guest.address)
          ]);
        });
      }

      // Loaded on demand: ~400kB that only the export button needs.
      const XLSX = await import('xlsx');

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Table Name
        { wch: 12 }, // Table Shape
        { wch: 10 }, // Capacity
        { wch: 12 }, // Seats Used
        { wch: 25 }, // Guest Name
        { wch: 12 }, // Party Size
        { wch: 15 }, // Phone Number
        { wch: 30 }, // Address
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Seating Chart');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `seating-chart-${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      toast.success('Seating chart exported to Excel');
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  }, [tables, unassignedGuests, toast]);

  // Snap to grid helper
  const snapPosition = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  /** Middle of the visible floor plan, in canvas coordinates, offset so a box
   *  of the given size lands centred there. */
  const viewCentre = useCallback(
    (size?: { width: number; height: number }) => {
      const rect = chartRef.current?.getBoundingClientRect();
      const width = size?.width ?? 0;
      const height = size?.height ?? 0;
      const x = rect ? (rect.width / 2 - panOffset.x) / zoomLevel : canvasSize.width / 2;
      const y = rect ? (rect.height / 2 - panOffset.y) / zoomLevel : canvasSize.height / 2;
      const placed = clampBox(
        snapPosition(x - width / 2),
        snapPosition(y - height / 2),
        width,
        height,
        canvasSize
      );
      return { positionX: placed.x, positionY: placed.y, x: placed.x, y: placed.y };
    },
    [panOffset, zoomLevel, canvasSize, snapPosition]
  );

  useEffect(() => {
    fetchTablesAndGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debouncedGuestSearchTerm.trim()) {
      setFilteredGuests(
        unassignedGuests.filter((guest) =>
          guest.name.toLowerCase().includes(debouncedGuestSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredGuests(unassignedGuests);
    }
  }, [unassignedGuests, debouncedGuestSearchTerm]);

  /** Remove items by id. Matching against the collections themselves is what
   *  makes this work for saved items: the database hands back UUIDs, so the
   *  old `id.startsWith('ref-')` test silently skipped every object that had
   *  been saved and reloaded. */
  const deleteItems = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      setLabels((prev) => prev.filter((l) => !ids.has(l.id)));
      setShapes((prev) => prev.filter((s) => !ids.has(s.id)));
      setReferenceObjects((prev) => prev.filter((r) => !ids.has(r.id)));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(ids.size > 1 ? `Deleted ${ids.size} items` : 'Deleted');
    },
    [toast]
  );

  const handleDeleteSelected = useCallback(() => deleteItems(selectedItems), [deleteItems, selectedItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (locked && (e.key === 'Delete' || e.key === 'Backspace')) return;

      switch (e.key.toLowerCase()) {
        case 'g':
          setShowGrid((prev) => !prev);
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setSnapToGrid((prev) => !prev);
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedItems.size > 0) {
            e.preventDefault();
            handleDeleteSelected();
          }
          break;
        case 'm':
          setShowMiniMap((prev) => !prev);
          break;
        case 'escape':
          setSelectedItems(new Set());
          dragRef.current = null;
          setDraggingId(null);
          setResizingItem(null);
          setRotatingItem(null);
          break;
        case 'l':
          setLocked((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, handleDeleteSelected, locked]);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    unassignedGuestsRef.current = unassignedGuests;
  }, [unassignedGuests]);

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

  const fetchTablesAndGuests = useCallback(() => loadSeating(true), [loadSeating]);
  const refreshData = useCallback(() => loadSeating(false), [loadSeating]);

  /** Move a guest between tables in local state so the UI responds instantly;
   *  the server call reconciles afterwards. */
  const applyAssignment = useCallback((guestId: string, tableId: string | null) => {
    setTables((prevTables) => {
      let moving = prevTables.flatMap((t) => t.guests).find((g) => g.id === guestId);
      if (!moving) {
        moving = unassignedGuestsRef.current.find((g) => g.id === guestId);
      }
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

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.name.trim()) return;

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTable,
          // Drop it where the organiser is looking, not at a random spot that
          // may be off-screen at the current zoom.
          ...viewCentre(getTableDimensions(newTable.shape)),
          rotation: 0,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTables((prev) => [...prev, { ...data.table, guests: [] }]);
        setNewTable({ name: '', shape: 'round', capacity: 8 });
        setShowAddTable(false);
        toast.success('Table added successfully');
      }
    } catch (error) {
      console.error('Failed to add table:', error);
      toast.error('Failed to add table');
    }
  };

  const handleSetTablePosition = useCallback(async (tableId: string, newX: number, newY: number) => {
    // Callers snap before clamping; clamp again here so any other entry point
    // (auto-arrange, alignment) also stays inside the floor plan.
    const shape = tablesRef.current.find((t) => t.id === tableId)?.shape || 'round';
    const { x: snappedX, y: snappedY } = clampToCanvas(newX, newY, shape, canvasSize);

    try {
      const response = await fetch('/api/tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tableId,
          positionX: snappedX,
          positionY: snappedY,
        }),
      });

      if (response.ok) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, positionX: snappedX, positionY: snappedY } : t))
        );
      }
    } catch (error) {
      console.error('Failed to set table position:', error);
    }
  }, [canvasSize]);

  /* ---- Zoom ------------------------------------------------------------ */

  // Live view, updated the moment a gesture computes it: a burst of wheel
  // events can arrive before React re-renders, and each must build on the
  // previous one rather than on a stale zoom.
  const viewRef = useRef({ zoom: zoomLevel, pan: panOffset });
  useEffect(() => {
    viewRef.current = { zoom: zoomLevel, pan: panOffset };
  }, [zoomLevel, panOffset]);

  /** Zoom while holding one point of the floor plan still under the given
   *  screen position (the cursor, or the middle of the viewport). The old
   *  version's algebra did not do this, which is what made wheel zoom jump. */
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

  /** Frame the whole edit zone. Also the reset button, because "back to 70%
   *  at offset 0,0" is only the right view by accident. */
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


  // Open on the whole floor plan rather than an arbitrary 70% corner view.
  const framedRef = useRef(false);
  useEffect(() => {
    if (loading || framedRef.current) return;
    framedRef.current = true;
    fitToView();
  }, [loading, fitToView]);

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

  /* ---- Dragging and panning -------------------------------------------- */

  const selectItem = useCallback((id: string, additive: boolean) => {
    setSelectedItems((prev) => {
      if (!additive) return prev.size === 1 && prev.has(id) ? prev : new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Start moving any canvas item. `x`/`y` are its current unsnapped position. */
  const startItemDrag = useCallback(
    (kind: DragKind, id: string, x: number, y: number, e: React.PointerEvent) => {
      // Claim the press first: anything reaching the canvas starts a pan.
      e.stopPropagation();
      // Buttons, inputs and popups keep their own clicks.
      if ((e.target as HTMLElement).closest('button, input, [data-no-drag]')) return;
      selectItem(id, e.shiftKey);
      if (locked) return;
      dragRef.current = {
        kind,
        id,
        pointerX: e.clientX,
        pointerY: e.clientY,
        originX: e.clientX,
        originY: e.clientY,
        x,
        y,
        moved: false,
      };
      setDraggingId(id);
    },
    [locked, selectItem]
  );

  const handleTableDragStart = useCallback(
    (tableId: string, e: React.PointerEvent) => {
      const table = tablesRef.current.find((t) => t.id === tableId);
      if (!table) return;
      startItemDrag('table', tableId, table.positionX, table.positionY, e);
    },
    [startItemDrag]
  );

  /** Empty canvas: pan, and drop the selection. */
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (pinchRef.current) return;
    panPointerRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    if (!e.shiftKey) setSelectedItems((prev) => (prev.size ? new Set() : prev));
  };

  // One window-level move loop for both gestures, so releasing outside the
  // canvas still ends them cleanly.
  useEffect(() => {
    if (!draggingId && !isPanning) return;

    const handleMove = (e: PointerEvent) => {
      if (isPanning) {
        const from = panPointerRef.current;
        if (!from || pinchRef.current) return;
        const deltaX = e.clientX - from.x;
        const deltaY = e.clientY - from.y;
        panPointerRef.current = { x: e.clientX, y: e.clientY };
        setPanOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;
      drag.x += (e.clientX - drag.pointerX) / zoomLevel;
      drag.y += (e.clientY - drag.pointerY) / zoomLevel;
      drag.pointerX = e.clientX;
      drag.pointerY = e.clientY;
      drag.moved =
        drag.moved || Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY) > 3;

      const place = (width: number, height: number) =>
        clampBox(snapPosition(drag.x), snapPosition(drag.y), width, height, canvasSize);

      if (drag.kind === 'table') {
        setTables((prev) =>
          prev.map((t) => {
            if (t.id !== drag.id) return t;
            const { width, height } = getTableDimensions(t.shape);
            const { x, y } = place(width, height);
            return { ...t, positionX: x, positionY: y };
          })
        );
      } else if (drag.kind === 'label') {
        setLabels((prev) => prev.map((l) => (l.id === drag.id ? { ...l, ...place(0, 0) } : l)));
      } else if (drag.kind === 'shape') {
        setShapes((prev) =>
          prev.map((sh) => (sh.id === drag.id ? { ...sh, ...place(sh.width, sh.height) } : sh))
        );
      } else {
        setReferenceObjects((prev) =>
          prev.map((r) => (r.id === drag.id ? { ...r, ...place(r.width, r.height) } : r))
        );
      }
    };

    const handleUp = () => {
      const drag = dragRef.current;
      // Only a real move is written back; a click to select is not a save.
      if (drag?.kind === 'table' && drag.moved) {
        const table = tablesRef.current.find((t) => t.id === drag.id);
        if (table) handleSetTablePosition(table.id, table.positionX, table.positionY);
      }
      dragRef.current = null;
      panPointerRef.current = null;
      setDraggingId(null);
      setIsPanning(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [draggingId, isPanning, zoomLevel, snapPosition, canvasSize, handleSetTablePosition]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (locked) return;

    // Handle resizing
    if (resizingItem) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      if (resizingItem.type === 'shape') {
        setShapes((prev) =>
          prev.map((shape) => {
            if (shape.id === resizingItem.id) {
              const newShape = { ...shape };
              if (resizingItem.handle.includes('e')) {
                newShape.width = Math.max(50, shape.width + deltaX / zoomLevel);
              }
              if (resizingItem.handle.includes('s')) {
                newShape.height = Math.max(50, shape.height + deltaY / zoomLevel);
              }
              if (resizingItem.handle.includes('w')) {
                const widthChange = -deltaX / zoomLevel;
                newShape.width = Math.max(50, shape.width + widthChange);
                newShape.x = shape.x - widthChange;
              }
              if (resizingItem.handle.includes('n')) {
                const heightChange = -deltaY / zoomLevel;
                newShape.height = Math.max(50, shape.height + heightChange);
                newShape.y = shape.y - heightChange;
              }
              return newShape;
            }
            return shape;
          })
        );
      } else if (resizingItem.type === 'ref') {
        setReferenceObjects((prev) =>
          prev.map((ref) => {
            if (ref.id === resizingItem.id) {
              const newRef = { ...ref };
              if (resizingItem.handle.includes('e')) {
                newRef.width = Math.max(40, ref.width + deltaX / zoomLevel);
              }
              if (resizingItem.handle.includes('s')) {
                newRef.height = Math.max(40, ref.height + deltaY / zoomLevel);
              }
              if (resizingItem.handle.includes('w')) {
                const widthChange = -deltaX / zoomLevel;
                newRef.width = Math.max(40, ref.width + widthChange);
                newRef.x = ref.x - widthChange;
              }
              if (resizingItem.handle.includes('n')) {
                const heightChange = -deltaY / zoomLevel;
                newRef.height = Math.max(40, ref.height + heightChange);
                newRef.y = ref.y - heightChange;
              }
              return newRef;
            }
            return ref;
          })
        );
      }

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }

    // Handle rotation
    if (rotatingItem && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();

      if (rotatingItem.type === 'shape') {
        const shape = shapes.find(s => s.id === rotatingItem.id);
        if (shape) {
          const centerX = (shape.x + shape.width / 2) * zoomLevel + panOffset.x + canvasRect.left;
          const centerY = (shape.y + shape.height / 2) * zoomLevel + panOffset.y + canvasRect.top;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

          setShapes((prev) =>
            prev.map((s) =>
              s.id === rotatingItem.id ? { ...s, rotation: Math.round(angle) } : s
            )
          );
        }
      } else if (rotatingItem.type === 'ref') {
        const ref = referenceObjects.find(r => r.id === rotatingItem.id);
        if (ref) {
          const centerX = (ref.x + ref.width / 2) * zoomLevel + panOffset.x + canvasRect.left;
          const centerY = (ref.y + ref.height / 2) * zoomLevel + panOffset.y + canvasRect.top;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

          setReferenceObjects((prev) =>
            prev.map((r) =>
              r.id === rotatingItem.id ? { ...r, rotation: Math.round(angle) } : r
            )
          );
        }
      } else if (rotatingItem.type === 'label') {
        const label = labels.find(l => l.id === rotatingItem.id);
        if (label) {
          const centerX = label.x * zoomLevel + panOffset.x + canvasRect.left;
          const centerY = label.y * zoomLevel + panOffset.y + canvasRect.top;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

          setLabels((prev) =>
            prev.map((l) =>
              l.id === rotatingItem.id ? { ...l, rotation: Math.round(angle) } : l
            )
          );
        }
      }
    }
  };

  const handleMouseUp = () => {
    setResizingItem(null);
    setRotatingItem(null);
  };


  /* ---- Touch gestures ------------------------------------------------- */

  /** Two fingers: pinch-zoom around their midpoint. One finger is handled by
   *  the pointer loop above, like every other gesture. */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    dragRef.current = null;
    panPointerRef.current = null;
    setDraggingId(null);
    setIsPanning(false);
    pinchRef.current = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      zoom: zoomLevel,
      midX: (a.clientX + b.clientX) / 2,
      midY: (a.clientY + b.clientY) / 2,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    zoomTo((pinchRef.current.zoom * distance) / pinchRef.current.distance, pinchRef.current.midX, pinchRef.current.midY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? Guests will be unassigned.')) {
      return;
    }

    try {
      const response = await fetch(`/api/tables?id=${tableId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTables((prev) => prev.filter((t) => t.id !== tableId));
        await refreshData();
        toast.success('Table deleted');
      }
    } catch (error) {
      console.error('Failed to delete table:', error);
      toast.error('Failed to delete table');
    }
  };

  const handleRenameTable = async (tableId: string, newName: string) => {
    try {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const response = await fetch('/api/tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tableId,
          name: newName,
          shape: table.shape,
          capacity: table.capacity,
          positionX: table.positionX,
          positionY: table.positionY,
          rotation: table.rotation,
        }),
      });

      if (response.ok) {
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, name: newName } : t))
        );
        toast.success('Table renamed');
      }
    } catch (error) {
      console.error('Failed to rename table:', error);
      toast.error('Failed to rename table');
    }
  };

  const handleAssignGuest = useCallback(
    async (guestId: string, tableId: string) => {
      const table = tables.find((t) => t.id === tableId);
      // Look across seated guests too: a guest being moved between tables is
      // not in unassignedGuests, which previously made this fail silently.
      const guest =
        unassignedGuests.find((g) => g.id === guestId) ||
        tables.flatMap((t) => t.guests).find((g) => g.id === guestId);

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
        toast.success(
          from ? `${guest.name} moved to ${table.name}` : `${guest.name} seated at ${table.name}`
        );
      } else {
        toast.error(result.error);
        await refreshData();
      }
    },
    [unassignedGuests, tables, refreshData, applyAssignment, toast]
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

  const handleRotateTable = useCallback(
    async (tableId: string, rotation: number) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, rotation } : t)));

      try {
        const response = await fetch('/api/tables', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: tableId,
            rotation,
          }),
        });

        if (!response.ok) {
          setTables((prev) =>
            prev.map((t) => (t.id === tableId ? { ...t, rotation: table.rotation || 0 } : t))
          );
        }
      } catch (error) {
        console.error('Failed to rotate table:', error);
        setTables((prev) =>
          prev.map((t) => (t.id === tableId ? { ...t, rotation: table.rotation || 0 } : t))
        );
      }
    },
    [tables]
  );

  const handleAutoArrange = useCallback(() => {
    if (tables.length === 0) return;

    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    let arrangedTables;

    if (tables.length === 1) {
      arrangedTables = [
        {
          ...tables[0],
          positionX: snapPosition(centerX - 50),
          positionY: snapPosition(centerY - 50),
        },
      ];
    } else {
      const radius = Math.min(canvasWidth, canvasHeight) * 0.3;
      arrangedTables = tables.map((table, index) => {
        const angle = (index * 2 * Math.PI) / tables.length;
        return {
          ...table,
          positionX: snapPosition(centerX + radius * Math.cos(angle) - 50),
          positionY: snapPosition(centerY + radius * Math.sin(angle) - 50),
        };
      });
    }

    setTables(arrangedTables);

    arrangedTables.forEach(async (table) => {
      try {
        await fetch('/api/tables', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: table.id,
            positionX: table.positionX,
            positionY: table.positionY,
          }),
        });
      } catch (error) {
        console.error('Failed to update table position:', error);
      }
    });

    toast.success('Tables auto-arranged');
  }, [tables, snapPosition, canvasSize, toast]);

  // Label functions
  const handleAddLabel = () => {
    const newLabel: Label = {
      id: `label-${Date.now()}`,
      text: 'New Label',
      ...viewCentre({ width: 100, height: 20 }),
      fontSize: 18,
      rotation: 0,
    };

    setLabels((prev) => [...prev, newLabel]);
    toast.success('Label added - click to edit text');
  };

  // Shape functions
  const handleAddShape = (type: 'rectangle' | 'circle' | 'line') => {
    const width = type === 'line' ? 150 : 200;
    const height = type === 'line' ? 4 : 150;

    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type,
      ...viewCentre({ width, height }),
      width,
      height,
      rotation: 0,
      color: 'rgba(34, 197, 94, 0.15)',
      label: type === 'rectangle' ? 'Zone' : undefined,
    };

    setShapes((prev) => [...prev, newShape]);
    toast.success(`${type} added`);
  };

  // Reference object functions
  const handleAddReferenceObject = (type: ReferenceObject['type']) => {
    const config = REFERENCE_OBJECT_CONFIGS[type];

    const newRefObject: ReferenceObject = {
      id: `ref-${Date.now()}`,
      type,
      ...viewCentre(config),
      width: config.width,
      height: config.height,
      rotation: 0,
    };

    setReferenceObjects((prev) => [...prev, newRefObject]);
    toast.success(`${config.label} added`);
  };

  // Alignment functions
  const handleAlignLeft = () => {
    const selectedTables = tables.filter((t) => selectedItems.has(t.id));
    if (selectedTables.length < 2) return;

    const minX = Math.min(...selectedTables.map((t) => t.positionX));
    selectedTables.forEach((table) => {
      handleSetTablePosition(table.id, minX, table.positionY);
    });
  };

  const handleAlignCenter = () => {
    const selectedTables = tables.filter((t) => selectedItems.has(t.id));
    if (selectedTables.length < 2) return;

    const avgX =
      selectedTables.reduce((sum, t) => sum + t.positionX, 0) / selectedTables.length;
    selectedTables.forEach((table) => {
      handleSetTablePosition(table.id, snapPosition(avgX), table.positionY);
    });
  };

  const handleAlignRight = () => {
    const selectedTables = tables.filter((t) => selectedItems.has(t.id));
    if (selectedTables.length < 2) return;

    const maxX = Math.max(...selectedTables.map((t) => t.positionX));
    selectedTables.forEach((table) => {
      handleSetTablePosition(table.id, maxX, table.positionY);
    });
  };

  const handleDistributeVertically = () => {
    const selectedTables = tables.filter((t) => selectedItems.has(t.id));
    if (selectedTables.length < 3) return;

    selectedTables.sort((a, b) => a.positionY - b.positionY);
    const minY = selectedTables[0].positionY;
    const maxY = selectedTables[selectedTables.length - 1].positionY;
    const spacing = (maxY - minY) / (selectedTables.length - 1);

    selectedTables.forEach((table, index) => {
      handleSetTablePosition(table.id, table.positionX, snapPosition(minY + spacing * index));
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div
          className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${themeConfig.classes.borderPrimary}`}
        />
        <p className={themeConfig.text.body}>Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* The sticky header already names the active tab on phones. */}
        <h2 className={`hidden md:block text-xl sm:text-2xl ${themeConfig.text.heading}`}>Seating Chart</h2>
        {/* Two columns on phones: four full-width buttons stacked would push
            the floor plan off the first screen. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:gap-2">
          <button
            onClick={savePreferences}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.secondary}`}
            title="Save layout"
          >
            <Save className="w-4 h-4" />
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Layout</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={tables.length === 0}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Export seating chart to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">Export to Excel</span>
          </button>
          <button
            onClick={handleAutoArrange}
            disabled={tables.length === 0}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Auto-arrange tables"
          >
            <Shuffle className="w-4 h-4" />
            <span className="sm:hidden">Arrange</span>
            <span className="hidden sm:inline">Auto Arrange</span>
          </button>
          <button
            onClick={() => setShowAddTable(true)}
            className={`inline-flex items-center justify-center gap-2 ${themeConfig.button.primary}`}
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
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
              <Users className="w-5 h-5" />
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
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeConfig.icon.color.secondary}`}
              />
              <input
                type="text"
                placeholder="Search guests..."
                value={guestSearchTerm}
                onChange={(e) => setGuestSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg ${themeConfig.input}`}
              />
            </div>
          </div>

          {isTouch && (
            <p className={`mb-2 text-xs ${themeConfig.text.muted}`}>
              Tap a guest to seat them at a table.
            </p>
          )}

          <div className="space-y-2 max-h-[45vh] lg:max-h-96 overflow-y-auto overscroll-contain">
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
          {/* Enhanced Toolbar */}
          <div className="space-y-3 mb-4">
            {/* Zoom Controls — always visible, even on phones. */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg ${themeConfig.theme.secondary[100]}`}
            >
              <button
                onClick={() => zoomBy(1 / 1.2)}
                className={`flex items-center gap-1 px-3 py-1 rounded ${themeConfig.button.secondary}`}
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span
                className={`text-sm font-medium min-w-[3rem] text-center ${themeConfig.text.body}`}
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => zoomBy(1.2)}
                className={`flex items-center gap-1 px-3 py-1 rounded ${themeConfig.button.secondary}`}
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={fitToView}
                className={`flex items-center gap-1 px-3 py-1 rounded ${themeConfig.button.secondary}`}
                title="Fit floor plan to view"
                aria-label="Fit floor plan to view"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLocked((prev) => !prev)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${locked ? themeConfig.button.primary : themeConfig.button.secondary}`}
                title={locked ? 'Unlock the floor plan for editing' : 'Lock the floor plan so nothing moves'}
                aria-pressed={locked}
              >
                {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="hidden sm:inline">{locked ? 'Locked' : 'Unlocked'}</span>
              </button>

              {/* The rest of the toolbar is a lot of controls for a phone, so
                  it hides behind this toggle below `md`. */}
              <button
                onClick={() => setShowTools((open) => !open)}
                aria-expanded={showTools}
                className={`ml-auto flex items-center gap-1 px-3 py-1 rounded md:hidden ${showTools ? themeConfig.button.primary : themeConfig.button.secondary}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Tools
              </button>

              <div className={`hidden md:flex items-center gap-1 text-sm ml-4 ${themeConfig.text.body}`}>
                <Move className="w-4 h-4" />
                <span>Drag empty space to pan · Ctrl/⌘+scroll to zoom</span>
              </div>
            </div>

            {/* Grid & Feature Controls */}
            <div className={`${showTools ? 'flex' : 'hidden'} md:flex items-center gap-2 flex-wrap`}>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${showGrid ? themeConfig.button.primary : themeConfig.button.secondary}`}
                title="Toggle Grid (G)"
              >
                <GridIcon className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${snapToGrid ? themeConfig.button.primary : themeConfig.button.secondary}`}
                title="Toggle Snap to Grid (S)"
              >
                <Move className="w-4 h-4" />
                Snap
              </button>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                aria-label="Grid size"
                /* `themeConfig.input` is w-full, which made this select claim a
                   whole toolbar row on its own. */
                className={cn(themeConfig.input, 'w-auto px-2 py-1 text-sm')}
              >
                <option value={20}>20px Grid</option>
                <option value={50}>50px Grid</option>
                <option value={100}>100px Grid</option>
              </select>

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
                  className={cn(themeConfig.input, 'w-20 px-2 py-1 text-sm disabled:opacity-50')}
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
                  className={cn(themeConfig.input, 'w-20 px-2 py-1 text-sm disabled:opacity-50')}
                />
              </div>

              <div className="hidden md:block w-px h-6 bg-stone-300 mx-1" />

              <button
                onClick={handleAddLabel}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${themeConfig.button.secondary}`}
                title="Add Label"
              >
                <Type className="w-4 h-4" />
                Add Label
              </button>

              <button
                onClick={() => handleAddShape('rectangle')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${themeConfig.button.secondary}`}
                title="Add Rectangle"
              >
                <Square className="w-4 h-4" />
                Rectangle
              </button>

              <button
                onClick={() => handleAddShape('circle')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${themeConfig.button.secondary}`}
                title="Add Circle"
              >
                <Circle className="w-4 h-4" />
                Circle
              </button>

              <button
                onClick={() => handleAddShape('line')}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${themeConfig.button.secondary}`}
                title="Add Line"
              >
                <Minus className="w-4 h-4" />
                Line
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowObjectDropdown(!showObjectDropdown)}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${themeConfig.button.secondary}`}
                  title="Add Reference Object"
                >
                  <Map className="w-4 h-4" />
                  Add Object
                </button>
                {showObjectDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border-2 border-stone-300 rounded-lg shadow-xl z-50 min-w-[180px]">
                    {Object.entries(REFERENCE_OBJECT_CONFIGS).map(([type, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            handleAddReferenceObject(type as ReferenceObject['type']);
                            setShowObjectDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-stone-800 hover:bg-stone-100 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="hidden md:block w-px h-6 bg-stone-300 mx-1" />

              <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleAlignLeft}
                disabled={selectedItems.size < 2}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${themeConfig.button.secondary} disabled:opacity-50`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleAlignCenter}
                disabled={selectedItems.size < 2}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${themeConfig.button.secondary} disabled:opacity-50`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={handleAlignRight}
                disabled={selectedItems.size < 2}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${themeConfig.button.secondary} disabled:opacity-50`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleDistributeVertically}
                disabled={selectedItems.size < 3}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${themeConfig.button.secondary} disabled:opacity-50`}
                title="Distribute Vertically"
              >
                <AlignVerticalSpaceAround className="w-4 h-4" />
              </button>
              </div>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedItems.size === 0}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${themeConfig.button.danger} disabled:opacity-50`}
                title="Delete Selected (Del)"
                aria-label="Delete selected items"
              >
                <Trash2 className="w-4 h-4" />
                <span className="md:hidden">Delete</span>
              </button>

              <div className="hidden md:block w-px h-6 bg-stone-300 mx-1" />

              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${showMiniMap ? themeConfig.button.primary : themeConfig.button.secondary}`}
                title="Toggle Mini-map (M)"
              >
                <Map className="w-4 h-4" />
                Mini-map
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={chartRef}
            className={`relative h-[min(62vh,760px)] min-h-[340px] md:h-[min(72vh,760px)] md:min-h-[480px] rounded-lg border-2 border-dashed overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} bg-stone-200/60`}
            /* Fixed viewport onto the floor plan: the inner surface keeps its
               unscaled layout size, so without an explicit height the container
               stretched to the full canvas and left dead space below.
               `touch-action: none` hands drags and pinches to the gesture
               handlers instead of scrolling the page. */
            style={{ position: 'relative', touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
                transition:
                  isPanning || draggingId || resizingItem || rotatingItem ? 'none' : 'transform 120ms ease-out',
              }}
            >
              {/* Grid */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #d4d4d8 1px, transparent 1px),
                      linear-gradient(to bottom, #d4d4d8 1px, transparent 1px)
                    `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    opacity: 0.4,
                    width: `${canvasSize.width}px`,
                    height: `${canvasSize.height}px`,
                  }}
                />
              )}

              {/* Shapes with resize and rotate handles */}
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  onPointerDown={(e) => startItemDrag('shape', shape.id, shape.x, shape.y, e)}
                  className={`absolute ${locked ? 'cursor-default' : 'cursor-move'} ${selectedItems.has(shape.id) ? 'ring-4 ring-emerald-500' : ''}`}
                  style={{
                    left: shape.x,
                    top: shape.y,
                    width: shape.width,
                    height: shape.height,
                    backgroundColor: shape.color,
                    borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'line' ? '4px' : '12px',
                    border: '2px dashed rgba(34, 197, 94, 0.5)',
                    transform: `rotate(${shape.rotation || 0}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  {shape.label && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-emerald-900 pointer-events-none">
                      {shape.label}
                    </div>
                  )}

                  {/* Resize handles */}
                  {selectedItems.has(shape.id) && (
                    <>
                      {/* Corner handles */}
                      <div
                        className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-nw-resize hover:scale-125 transition-transform"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'nw' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-ne-resize hover:scale-125 transition-transform"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'ne' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-sw-resize hover:scale-125 transition-transform"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'sw' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-se-resize hover:scale-125 transition-transform"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'se' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />

                      {/* Rotate handle */}
                      <div
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full cursor-pointer hover:scale-125 transition-transform flex items-center justify-center"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setRotatingItem({ type: 'shape', id: shape.id });
                        }}
                      >
                        <RotateCw className="w-3 h-3 text-white" />
                      </div>

                      {/* Delete handle: the Del key is not discoverable, and
                          was the only way to remove an object. */}
                      <button
                        className="absolute -top-8 right-0 w-6 h-6 bg-red-600 rounded-full hover:scale-110 transition-transform flex items-center justify-center text-white"
                        title="Delete"
                        aria-label="Delete item"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItems(new Set([shape.id]));
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Reference Objects with resize and rotate handles */}
              {referenceObjects.map((ref) => {
                const config = REFERENCE_OBJECT_CONFIGS[ref.type];
                const Icon = config.icon;
                return (
                  <div
                    key={ref.id}
                    onPointerDown={(e) => startItemDrag('ref', ref.id, ref.x, ref.y, e)}
                    className={`absolute ${locked ? 'cursor-default' : 'cursor-move'} border-2 border-dashed rounded-lg flex flex-col items-center justify-center font-semibold text-xs ${config.color} ${selectedItems.has(ref.id) ? 'ring-4 ring-emerald-500' : ''}`}
                    style={{
                      left: ref.x,
                      top: ref.y,
                      width: ref.width,
                      height: ref.height,
                      transform: `rotate(${ref.rotation || 0}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    <Icon className="w-6 h-6 mb-1" />
                    {config.label}

                    {/* Resize handles */}
                    {selectedItems.has(ref.id) && (
                      <>
                        {/* Corner handles */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-nw-resize hover:scale-125 transition-transform"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'nw' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-ne-resize hover:scale-125 transition-transform"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'ne' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-sw-resize hover:scale-125 transition-transform"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'sw' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-se-resize hover:scale-125 transition-transform"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'se' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />

                        {/* Rotate handle */}
                        <div
                          className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full cursor-pointer hover:scale-125 transition-transform flex items-center justify-center"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setRotatingItem({ type: 'ref', id: ref.id });
                          }}
                        >
                          <RotateCw className="w-3 h-3 text-white" />
                        </div>

                        {/* Delete handle: the Del key is not discoverable, and
                            was the only way to remove an object. */}
                        <button
                          className="absolute -top-8 right-0 w-6 h-6 bg-red-600 rounded-full hover:scale-110 transition-transform flex items-center justify-center text-white"
                          title="Delete"
                          aria-label="Delete item"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItems(new Set([ref.id]));
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Labels with rotation and font size control */}
              {labels.map((label) => (
                <div
                  key={label.id}
                  onPointerDown={(e) => startItemDrag('label', label.id, label.x, label.y, e)}
                  className={`absolute ${locked ? 'cursor-default' : 'cursor-move'} font-bold ${themeConfig.text.heading} ${selectedItems.has(label.id) ? 'ring-4 ring-emerald-500 bg-white/80 rounded-lg px-3 py-1' : 'bg-white/60 rounded px-2'}`}
                  style={{
                    left: label.x,
                    top: label.y,
                    fontSize: label.fontSize,
                    transform: `rotate(${label.rotation || 0}deg)`,
                    transformOrigin: 'center',
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newText = e.currentTarget.textContent || 'Label';
                    setLabels((prev) =>
                      prev.map((l) => (l.id === label.id ? { ...l, text: newText } : l))
                    );
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {label.text}

                  {/* Font size controls */}
                  {selectedItems.has(label.id) && (
                    <div className="absolute -top-10 left-0 flex gap-1 bg-white border border-stone-300 rounded p-1 shadow-lg">
                      <button
                        className="px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setLabels((prev) =>
                            prev.map((l) => (l.id === label.id ? { ...l, fontSize: Math.max(10, l.fontSize - 2) } : l))
                          );
                        }}
                      >
                        A-
                      </button>
                      <button
                        className="px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setLabels((prev) =>
                            prev.map((l) => (l.id === label.id ? { ...l, fontSize: Math.min(48, l.fontSize + 2) } : l))
                          );
                        }}
                      >
                        A+
                      </button>
                      <div
                        className="w-6 h-6 bg-blue-600 rounded cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setRotatingItem({ type: 'label', id: label.id });
                        }}
                      >
                        <RotateCw className="w-3 h-3 text-white" />
                      </div>
                      <button
                        className="w-6 h-6 bg-red-600 rounded hover:scale-110 transition-transform flex items-center justify-center text-white"
                        title="Delete label"
                        aria-label="Delete label"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItems(new Set([label.id]));
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Tables */}
              {tables.map((table) => (
                <DraggableTable
                  key={table.id}
                  table={table}
                  onDelete={() => handleDeleteTable(table.id)}
                  onAssignGuest={handleAssignGuest}
                  onUnassignGuest={handleUnassignGuest}
                  onRotate={handleRotateTable}
                  onRename={handleRenameTable}
                  allTableNames={tables.map((t) => t.name)}
                  onDragStart={handleTableDragStart}
                  isDragging={draggingId === table.id}
                  isSelected={selectedItems.has(table.id)}
                  locked={locked}
                  onSeatGuest={setSeatingGuest}
                />
              ))}

              {tables.length === 0 && (
                <div
                  className={`absolute inset-0 flex items-center justify-center ${themeConfig.empty.container}`}
                >
                  <div className="text-center">
                    <GridIcon
                      className={`w-12 h-12 mx-auto mb-4 opacity-50 ${themeConfig.empty.icon}`}
                    />
                    <p className={themeConfig.empty.text}>
                      No tables yet. Click &ldquo;Add Table&rdquo; to get started.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mini-map */}
            {showMiniMap && tables.length > 0 && (
              <div className="absolute bottom-3 right-3 h-20 w-28 sm:bottom-4 sm:right-4 sm:h-36 sm:w-48 bg-white border-2 border-stone-400 rounded-lg shadow-lg overflow-hidden pointer-events-none">
                <div className="relative w-full h-full bg-stone-100">
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-800 font-semibold">
                    Mini-map
                  </div>
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className="absolute bg-emerald-600 rounded-sm opacity-70"
                      style={{
                        left: `${(table.positionX / canvasSize.width) * 100}%`,
                        top: `${(table.positionY / canvasSize.height) * 100}%`,
                        width: '10px',
                        height: '10px',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Helper Text */}
          <p className={`mt-3 text-xs md:hidden ${themeConfig.text.muted}`}>
            Drag the floor plan to pan, pinch to zoom, and drag a table to move it.
            Tap a table&rsquo;s name to rename it or its seat count to see who is
            sitting there.
          </p>
          <div className="mt-3 hidden text-xs text-stone-800 space-y-1 md:block">
            <p>• <strong>Move:</strong> Drag a table, label, shape or object. Drag empty space to pan the floor plan.</p>
            <p>• <strong>Zoom:</strong> Ctrl/⌘+scroll (or pinch) zooms where the cursor is; the fit button frames the whole plan.</p>
            <p>• <strong>Select:</strong> Click to select, Shift+Click to add. Delete with the red × or the Delete key.</p>
            <p>• <strong>Resize &amp; rotate:</strong> Corner handles resize, the blue button rotates.</p>
            <p>• <strong>Floor plan:</strong> Set its size in px, and lock it so nothing moves by accident.</p>
            <p>• <strong>Keyboard:</strong> G (grid), S (snap), M (mini-map), L (lock), Delete, Esc</p>
          </div>
        </div>
      </div>

      {seatingGuest && (
        <AssignGuestSheet
          guest={seatingGuest}
          tables={tables}
          onAssign={(tableId) => {
            if (tableId) {
              handleAssignGuest(seatingGuest.id, tableId);
            } else {
              handleUnassignGuest(seatingGuest.id);
            }
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
                <label className={`block ${themeConfig.text.label} mb-1`}>Table Name</label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="e.g., Table 1, Head Table, etc."
                  className={themeConfig.input}
                  required
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>Table Shape</label>
                <select
                  value={newTable.shape}
                  onChange={(e) => {
                    const newShape = e.target.value;
                    setNewTable({
                      ...newTable,
                      shape: newShape,
                      capacity: getDefaultCapacity(newShape),
                    });
                  }}
                  className={themeConfig.input}
                >
                  <option value="round">Round Table</option>
                  <option value="rectangular">Rectangular Table</option>
                  <option value="square">Square Table</option>
                  <option value="oval">Oval Table</option>
                  <option value="u-shape">U-Shape Table</option>
                  <option value="cocktail">Cocktail Table</option>
                </select>
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTable.capacity}
                  onChange={(e) =>
                    setNewTable({ ...newTable, capacity: parseInt(e.target.value) })
                  }
                  className={themeConfig.input}
                  required
                />
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
