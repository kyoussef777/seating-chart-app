'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import {
  Plus,
  Users,
  Grid as GridIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';
import DraggableTable from './DraggableTable';
import DraggableGuest from './DraggableGuest';

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
  const [draggedItem, setDraggedItem] = useState<{ type: 'label' | 'shape' | 'ref'; id: string } | null>(null);
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
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
        }

        // Load layout objects from database
        const [labelsRes, shapesRes, objectsRes] = await Promise.all([
          fetch('/api/layout/labels'),
          fetch('/api/layout/shapes'),
          fetch('/api/layout/reference-objects'),
        ]);

        if (labelsRes.ok) {
          const labelsData = await labelsRes.json();
          setLabels(labelsData.map((l: { id: string; text: string; x: number; y: number; fontSize?: number; font_size?: number; rotation?: number }) => ({
            id: l.id,
            text: l.text,
            x: l.x,
            y: l.y,
            fontSize: l.fontSize || l.font_size || 16,
            rotation: l.rotation || 0,
          })));
        }

        if (shapesRes.ok) {
          const shapesData = await shapesRes.json();
          setShapes(shapesData.map((s: { id: string; type: string; x: number; y: number; width: number; height: number; rotation?: number; color: string; label?: string }) => ({
            id: s.id,
            type: s.type,
            x: s.x,
            y: s.y,
            width: s.width,
            height: s.height,
            rotation: s.rotation || 0,
            color: s.color,
            label: s.label,
          })));
        }

        if (objectsRes.ok) {
          const objectsData = await objectsRes.json();
          setReferenceObjects(objectsData.map((o: { id: string; type: string; x: number; y: number; width: number; height: number; rotation?: number }) => ({
            id: o.id,
            type: o.type,
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            rotation: o.rotation || 0,
          })));
        }
      } catch (error) {
        console.error('Failed to load layout data:', error);
      }
    };

    loadLayoutData();
  }, []);

  // Save layout to database and preferences to localStorage
  const savePreferences = useCallback(async () => {
    try {
      // Save UI preferences to localStorage
      const prefs = {
        showGrid,
        snapToGrid,
        gridSize,
        showMiniMap,
      };
      localStorage.setItem('seatingChartPreferences', JSON.stringify(prefs));

      // Save layout objects to database
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

      toast.success('Layout saved to database');
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast.error('Failed to save layout');
    }
  }, [showGrid, snapToGrid, gridSize, showMiniMap, labels, shapes, referenceObjects, toast]);

  // Export seating chart to Excel
  const exportToExcel = useCallback(() => {
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
            table.name,
            table.shape,
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
              index === 0 ? table.name : '', // Only show table info on first guest row
              index === 0 ? table.shape : '',
              index === 0 ? table.capacity : '',
              index === 0 ? seatsUsed : '',
              guest.name,
              guest.partySize || 1,
              guest.phoneNumber || '',
              guest.address || ''
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
            guest.name,
            guest.partySize || 1,
            guest.phoneNumber || '',
            guest.address || ''
          ]);
        });
      }

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

  const [, drop] = useDrop(
    () => ({
      accept: ['table', 'guest'],
      drop: (item: { id: string; type: string }, monitor) => {
        if (!monitor.didDrop() && item.type === 'table') {
          const dropOffset = monitor.getClientOffset();
          const canvasRect = chartRef.current?.getBoundingClientRect();

          if (dropOffset && canvasRect) {
            // Account for zoom and pan when calculating drop position
            const x = snapPosition(
              Math.max(0, (dropOffset.x - canvasRect.left - panOffset.x) / zoomLevel - 50)
            );
            const y = snapPosition(
              Math.max(0, (dropOffset.y - canvasRect.top - panOffset.y) / zoomLevel - 40)
            );
            handleSetTablePosition(item.id, x, y);
          }
        }
      },
    }),
    [zoomLevel, panOffset, snapPosition]
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

  // Delete selected items
  const handleDeleteSelected = useCallback(() => {
    if (selectedItems.size === 0) return;

    selectedItems.forEach((id) => {
      if (id.startsWith('label-')) {
        setLabels((prev) => prev.filter((l) => l.id !== id));
      } else if (id.startsWith('shape-')) {
        setShapes((prev) => prev.filter((s) => s.id !== id));
      } else if (id.startsWith('ref-')) {
        setReferenceObjects((prev) => prev.filter((r) => r.id !== id));
      }
    });
    setSelectedItems(new Set());
    toast.success('Deleted selected items');
  }, [selectedItems, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
          setDraggedItem(null);
          setResizingItem(null);
          setRotatingItem(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, handleDeleteSelected]);

  const fetchTablesAndGuests = useCallback(async () => {
    try {
      const [tablesResponse, guestsResponse] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/guests'),
      ]);

      const [tablesData, guestsData] = await Promise.all([
        tablesResponse.json(),
        guestsResponse.json(),
      ]);

      if (tablesResponse.ok && guestsResponse.ok) {
        const guestsByTable: { [key: string]: Guest[] } = {};
        const unassigned: Guest[] = [];

        guestsData.guests.forEach((guest: Guest) => {
          if (guest.tableId) {
            if (!guestsByTable[guest.tableId]) {
              guestsByTable[guest.tableId] = [];
            }
            guestsByTable[guest.tableId].push(guest);
          } else {
            unassigned.push(guest);
          }
        });

        const tablesWithGuests = tablesData.tables.map((table: Table) => ({
          ...table,
          rotation: table.rotation || 0,
          guests: guestsByTable[table.id] || [],
        }));

        setTables(tablesWithGuests);
        setUnassignedGuests(unassigned);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [tablesResponse, guestsResponse] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/guests'),
      ]);

      const [tablesData, guestsData] = await Promise.all([
        tablesResponse.json(),
        guestsResponse.json(),
      ]);

      if (tablesResponse.ok && guestsResponse.ok) {
        const guestsByTable: { [key: string]: Guest[] } = {};
        const unassigned: Guest[] = [];

        guestsData.guests.forEach((guest: Guest) => {
          if (guest.tableId) {
            if (!guestsByTable[guest.tableId]) {
              guestsByTable[guest.tableId] = [];
            }
            guestsByTable[guest.tableId].push(guest);
          } else {
            unassigned.push(guest);
          }
        });

        const tablesWithGuests = tablesData.tables.map((table: Table) => ({
          ...table,
          rotation: table.rotation || 0,
          guests: guestsByTable[table.id] || [],
        }));

        setTables(tablesWithGuests);
        setUnassignedGuests(unassigned);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
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
          positionX: snapPosition(Math.random() * 400 + 50),
          positionY: snapPosition(Math.random() * 300 + 50),
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

  const handleSetTablePosition = async (tableId: string, newX: number, newY: number) => {
    const snappedX = snapPosition(newX);
    const snappedY = snapPosition(newY);

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
  };

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleResetZoom = () => {
    setZoomLevel(0.7);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }

    // Handle dragging labels, shapes, and reference objects
    if (draggedItem) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      if (draggedItem.type === 'label') {
        setLabels((prev) =>
          prev.map((label) =>
            label.id === draggedItem.id
              ? {
                  ...label,
                  x: snapPosition(label.x + deltaX / zoomLevel),
                  y: snapPosition(label.y + deltaY / zoomLevel),
                }
              : label
          )
        );
      } else if (draggedItem.type === 'shape') {
        setShapes((prev) =>
          prev.map((shape) =>
            shape.id === draggedItem.id
              ? {
                  ...shape,
                  x: snapPosition(shape.x + deltaX / zoomLevel),
                  y: snapPosition(shape.y + deltaY / zoomLevel),
                }
              : shape
          )
        );
      } else if (draggedItem.type === 'ref') {
        setReferenceObjects((prev) =>
          prev.map((ref) =>
            ref.id === draggedItem.id
              ? {
                  ...ref,
                  x: snapPosition(ref.x + deltaX / zoomLevel),
                  y: snapPosition(ref.y + deltaY / zoomLevel),
                }
              : ref
          )
        );
      }

      setLastMousePos({ x: e.clientX, y: e.clientY });
    }

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
    setIsPanning(false);
    setDraggedItem(null);
    setResizingItem(null);
    setRotatingItem(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl+Wheel or pinch gesture (ctrlKey is set on trackpad pinch) = zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      // More sensitive zoom for better trackpad experience
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newZoom = Math.max(0.3, Math.min(2, zoomLevel + delta));

      // Zoom towards cursor position
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate the point under the cursor before zoom
        const beforeX = (mouseX - panOffset.x) / zoomLevel;
        const beforeY = (mouseY - panOffset.y) / zoomLevel;

        // Calculate the point under the cursor after zoom
        const afterX = (mouseX - panOffset.x) / newZoom;
        const afterY = (mouseY - panOffset.y) / newZoom;

        // Adjust pan to keep the same point under the cursor
        setPanOffset({
          x: panOffset.x + (beforeX - afterX) * newZoom,
          y: panOffset.y + (beforeY - afterY) * newZoom,
        });
      }

      setZoomLevel(newZoom);
    }
    // Regular wheel/trackpad scroll = pan
    else if (!e.shiftKey) {
      e.preventDefault();

      // Smooth panning for trackpad
      setPanOffset({
        x: panOffset.x - e.deltaX,
        y: panOffset.y - e.deltaY,
      });
    }
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
      const guest = unassignedGuests.find((g) => g.id === guestId);
      const table = tables.find((t) => t.id === tableId);

      if (!guest || !table) {
        console.error('Guest or table not found');
        return;
      }

      const seatsUsed = table.guests.reduce((total, g) => total + (g.partySize || 1), 0);
      const availableSeats = table.capacity - seatsUsed;
      const partySize = guest.partySize || 1;

      if (availableSeats < partySize) {
        toast.error(
          `Not enough space! This party needs ${partySize} seat${partySize > 1 ? 's' : ''} but only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available at ${table.name}.`
        );
        return;
      }

      try {
        const response = await fetch('/api/guests', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: guestId,
            tableId,
          }),
        });

        if (response.ok) {
          await refreshData();
          toast.success(`${guest.name} assigned to ${table.name}`);
        } else {
          const errorData = await response.json();
          toast.error(`Failed to assign guest: ${errorData.error || 'Unknown error'}`);
          await refreshData();
        }
      } catch (error) {
        console.error('Failed to assign guest:', error);
        toast.error('Failed to assign guest. Please try again.');
        await refreshData();
      }
    },
    [unassignedGuests, tables, refreshData, toast]
  );

  const handleUnassignGuest = useCallback(
    async (guestId: string) => {
      try {
        const response = await fetch('/api/guests', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: guestId,
            tableId: null,
          }),
        });

        if (response.ok) {
          await refreshData();
          toast.success('Guest unassigned');
        }
      } catch (error) {
        console.error('Failed to unassign guest:', error);
        toast.error('Failed to unassign guest');
      }
    },
    [refreshData, toast]
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

    const canvasWidth = 800;
    const canvasHeight = 600;
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
  }, [tables, snapPosition, toast]);

  // Label functions
  const handleAddLabel = () => {
    const canvasRect = chartRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const centerX = (canvasRect.width / 2 - panOffset.x) / zoomLevel;
    const centerY = (canvasRect.height / 2 - panOffset.y) / zoomLevel;

    const newLabel: Label = {
      id: `label-${Date.now()}`,
      text: 'New Label',
      x: snapPosition(centerX - 50),
      y: snapPosition(centerY - 10),
      fontSize: 18,
      rotation: 0,
    };

    setLabels((prev) => [...prev, newLabel]);
    toast.success('Label added - click to edit text');
  };

  const handleLabelMouseDown = (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedItem({ type: 'label', id: labelId });
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (e.shiftKey) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(labelId)) {
          newSet.delete(labelId);
        } else {
          newSet.add(labelId);
        }
        return newSet;
      });
    } else {
      setSelectedItems(new Set([labelId]));
    }
  };

  // Shape functions
  const handleAddShape = (type: 'rectangle' | 'circle' | 'line') => {
    const canvasRect = chartRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const centerX = (canvasRect.width / 2 - panOffset.x) / zoomLevel;
    const centerY = (canvasRect.height / 2 - panOffset.y) / zoomLevel;

    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type,
      x: snapPosition(centerX - 100),
      y: snapPosition(centerY - 75),
      width: type === 'line' ? 150 : 200,
      height: type === 'line' ? 4 : 150,
      rotation: 0,
      color: 'rgba(34, 197, 94, 0.15)',
      label: type === 'rectangle' ? 'Zone' : undefined,
    };

    setShapes((prev) => [...prev, newShape]);
    toast.success(`${type} added`);
  };

  const handleShapeMouseDown = (shapeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedItem({ type: 'shape', id: shapeId });
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (e.shiftKey) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(shapeId)) {
          newSet.delete(shapeId);
        } else {
          newSet.add(shapeId);
        }
        return newSet;
      });
    } else {
      setSelectedItems(new Set([shapeId]));
    }
  };

  // Reference object functions
  const handleAddReferenceObject = (type: ReferenceObject['type']) => {
    const canvasRect = chartRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const centerX = (canvasRect.width / 2 - panOffset.x) / zoomLevel;
    const centerY = (canvasRect.height / 2 - panOffset.y) / zoomLevel;

    const config = REFERENCE_OBJECT_CONFIGS[type];

    const newRefObject: ReferenceObject = {
      id: `ref-${Date.now()}`,
      type,
      x: snapPosition(centerX - config.width / 2),
      y: snapPosition(centerY - config.height / 2),
      width: config.width,
      height: config.height,
      rotation: 0,
    };

    setReferenceObjects((prev) => [...prev, newRefObject]);
    toast.success(`${config.label} added`);
  };

  const handleRefObjectMouseDown = (refId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedItem({ type: 'ref', id: refId });
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (e.shiftKey) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(refId)) {
          newSet.delete(refId);
        } else {
          newSet.add(refId);
        }
        return newSet;
      });
    } else {
      setSelectedItems(new Set([refId]));
    }
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

  // Calculate stats
  const totalGuests = tables.reduce((sum, t) => sum + t.guests.reduce((gs, g) => gs + (g.partySize || 1), 0), 0) + unassignedGuests.reduce((sum, g) => sum + (g.partySize || 1), 0);
  const assignedGuests = tables.reduce((sum, t) => sum + t.guests.reduce((gs, g) => gs + (g.partySize || 1), 0), 0);
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const assignmentPercent = totalGuests > 0 ? Math.round((assignedGuests / totalGuests) * 100) : 0;
  const tablesAtCapacity = tables.filter(t => {
    const used = t.guests.reduce((sum, g) => sum + (g.partySize || 1), 0);
    return used >= t.capacity;
  }).length;

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
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className={`text-2xl ${themeConfig.text.heading}`}>Seating Chart</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={savePreferences}
            className={`inline-flex items-center gap-1.5 text-sm ${themeConfig.button.secondary}`}
            title="Save layout"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Save Layout</span>
            <span className="sm:hidden">Save</span>
          </button>
          <button
            onClick={exportToExcel}
            disabled={tables.length === 0}
            className={`inline-flex items-center gap-1.5 text-sm ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Export seating chart to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={handleAutoArrange}
            disabled={tables.length === 0}
            className={`inline-flex items-center gap-1.5 text-sm ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Auto-arrange tables"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Auto Arrange</span>
            <span className="sm:hidden">Arrange</span>
          </button>
          <button
            onClick={() => setShowAddTable(true)}
            className={`inline-flex items-center gap-1.5 text-sm ${themeConfig.button.primary}`}
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {(tables.length > 0 || unassignedGuests.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
            <div className={`text-xs ${themeConfig.text.muted} mb-0.5`}>Tables</div>
            <div className={`text-xl font-bold ${themeConfig.text.heading}`}>{tables.length}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
            <div className={`text-xs ${themeConfig.text.muted} mb-0.5`}>Total Seats</div>
            <div className={`text-xl font-bold ${themeConfig.text.heading}`}>{assignedGuests}/{totalCapacity}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
            <div className={`text-xs ${themeConfig.text.muted} mb-0.5`}>Assigned</div>
            <div className="flex items-center gap-2">
              <div className={`text-xl font-bold ${assignmentPercent === 100 ? 'text-emerald-600' : themeConfig.text.heading}`}>{assignmentPercent}%</div>
              <div className="flex-1 bg-stone-200 rounded-full h-1.5 min-w-[40px]">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${assignmentPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${assignmentPercent}%` }}
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
            <div className={`text-xs ${themeConfig.text.muted} mb-0.5`}>Unassigned</div>
            <div className={`text-xl font-bold ${unassignedGuests.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {unassignedGuests.reduce((sum, g) => sum + (g.partySize || 1), 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm col-span-2 sm:col-span-1">
            <div className={`text-xs ${themeConfig.text.muted} mb-0.5`}>Full Tables</div>
            <div className={`text-xl font-bold ${tablesAtCapacity > 0 ? 'text-rose-600' : themeConfig.text.heading}`}>
              {tablesAtCapacity}/{tables.length}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Unassigned Guests Sidebar */}
        <div className={`lg:col-span-1 ${themeConfig.card}`}>
          <h3
            className={`font-semibold mb-3 flex items-center justify-between ${themeConfig.text.heading}`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Unassigned
            </span>
            <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${unassignedGuests.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {unassignedGuests.reduce((sum, g) => sum + (g.partySize || 1), 0)} seats
            </span>
          </h3>

          <div className="mb-3">
            <div className="relative">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${themeConfig.icon.color.secondary}`}
              />
              <input
                type="text"
                placeholder="Filter guests..."
                value={guestSearchTerm}
                onChange={(e) => setGuestSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg ${themeConfig.input}`}
              />
            </div>
          </div>

          <div className="text-xs text-stone-400 mb-2 px-1">
            Drag guests to tables to assign them
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredGuests.map((guest) => (
              <DraggableGuest
                key={guest.id}
                guest={guest}
                onUnassign={() => handleUnassignGuest(guest.id)}
              />
            ))}
            {filteredGuests.length === 0 && unassignedGuests.length > 0 && (
              <div className="text-center py-4">
                <p className={`text-sm ${themeConfig.text.muted}`}>
                  No guests matching &ldquo;{guestSearchTerm}&rdquo;
                </p>
              </div>
            )}
            {unassignedGuests.length === 0 && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <p className={`text-sm font-medium text-emerald-700`}>All guests assigned!</p>
                <p className="text-xs text-stone-400 mt-1">Every guest has a table</p>
              </div>
            )}
          </div>
        </div>

        {/* Seating Chart Canvas */}
        <div className={`lg:col-span-3 ${themeConfig.card}`}>
          {/* Toolbar - organized into rows */}
          <div className="space-y-2 mb-4">
            {/* Row 1: View Controls */}
            <div className={`flex items-center gap-1.5 p-2 rounded-lg ${themeConfig.theme.secondary[100]} flex-wrap`}>
              {/* Zoom */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-stone-200 px-1">
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-stone-100 rounded transition-colors" title="Zoom Out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className={`text-xs font-medium min-w-[2.5rem] text-center ${themeConfig.text.body}`}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-stone-100 rounded transition-colors" title="Zoom In">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleResetZoom} className="p-1.5 hover:bg-stone-100 rounded transition-colors border-l border-stone-200" title="Reset View">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-6 bg-stone-300" />

              {/* Grid controls */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showGrid ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                title="Toggle Grid (G)"
              >
                <GridIcon className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${snapToGrid ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                title="Toggle Snap (S)"
              >
                <Move className="w-3.5 h-3.5" />
                Snap
              </button>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg text-xs bg-white border border-stone-200 text-stone-600"
              >
                <option value={20}>20px</option>
                <option value={50}>50px</option>
                <option value={100}>100px</option>
              </select>

              <div className="w-px h-6 bg-stone-300" />

              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${showMiniMap ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                title="Toggle Mini-map (M)"
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>

              <div className="flex-1" />

              <span className={`text-xs ${themeConfig.text.muted} hidden md:flex items-center gap-1`}>
                <Move className="w-3 h-3" />
                Scroll to pan &middot; Ctrl+scroll to zoom
              </span>
            </div>

            {/* Row 2: Layout Tools */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Add elements */}
              <span className="text-xs text-stone-400 font-medium mr-1">Add:</span>
              <button
                onClick={handleAddLabel}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors`}
                title="Add Label"
              >
                <Type className="w-3.5 h-3.5" />
                Label
              </button>
              <button
                onClick={() => handleAddShape('rectangle')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors`}
                title="Add Rectangle"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleAddShape('circle')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors`}
                title="Add Circle"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleAddShape('line')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors`}
                title="Add Line"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowObjectDropdown(!showObjectDropdown)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors`}
                  title="Add Reference Object"
                >
                  <Map className="w-3.5 h-3.5" />
                  Objects
                </button>
                {showObjectDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
                    {Object.entries(REFERENCE_OBJECT_CONFIGS).map(([type, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            handleAddReferenceObject(type as ReferenceObject['type']);
                            setShowObjectDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-stone-300 mx-0.5" />

              {/* Alignment */}
              <span className="text-xs text-stone-400 font-medium mr-1">Align:</span>
              <button onClick={handleAlignLeft} disabled={selectedItems.size < 2}
                className="p-1.5 rounded-lg text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors" title="Align Left">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleAlignCenter} disabled={selectedItems.size < 2}
                className="p-1.5 rounded-lg text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors" title="Align Center">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleAlignRight} disabled={selectedItems.size < 2}
                className="p-1.5 rounded-lg text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors" title="Align Right">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDistributeVertically} disabled={selectedItems.size < 3}
                className="p-1.5 rounded-lg text-stone-500 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-30 transition-colors" title="Distribute Vertically">
                <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-5 bg-stone-300 mx-0.5" />

              <button
                onClick={handleDeleteSelected}
                disabled={selectedItems.size === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-white border border-stone-200 hover:bg-rose-50 hover:border-rose-200 disabled:opacity-30 transition-colors"
                title="Delete Selected (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={(el) => {
              chartRef.current = el;
              drop(el);
            }}
            className={`relative rounded-lg min-h-[600px] border-2 border-dashed overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-default'} bg-stone-50`}
            style={{ position: 'relative' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onMouseLeave={handleMouseUp}
          >
            <div
              ref={canvasRef}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                minHeight: '600px',
                position: 'relative',
                transition: isPanning || draggedItem || resizingItem || rotatingItem ? 'none' : 'transform 0.1s ease-out',
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
                    width: '2000px',
                    height: '2000px',
                  }}
                />
              )}

              {/* Shapes with resize and rotate handles */}
              {shapes.map((shape) => (
                <div
                  key={shape.id}
                  onMouseDown={(e) => handleShapeMouseDown(shape.id, e)}
                  className={`absolute cursor-move transition-shadow ${selectedItems.has(shape.id) ? 'ring-4 ring-emerald-500' : ''}`}
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
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'nw' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-ne-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'ne' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-sw-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'sw' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-se-resize hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingItem({ type: 'shape', id: shape.id, handle: 'se' });
                          setLastMousePos({ x: e.clientX, y: e.clientY });
                        }}
                      />

                      {/* Rotate handle */}
                      <div
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full cursor-pointer hover:scale-125 transition-transform flex items-center justify-center"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setRotatingItem({ type: 'shape', id: shape.id });
                        }}
                      >
                        <RotateCw className="w-3 h-3 text-white" />
                      </div>
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
                    onMouseDown={(e) => handleRefObjectMouseDown(ref.id, e)}
                    className={`absolute cursor-move border-2 border-dashed rounded-lg flex flex-col items-center justify-center font-semibold text-xs transition-shadow ${config.color} ${selectedItems.has(ref.id) ? 'ring-4 ring-emerald-500' : ''}`}
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
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'nw' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-ne-resize hover:scale-125 transition-transform"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'ne' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-600 rounded-full cursor-sw-resize hover:scale-125 transition-transform"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'sw' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full cursor-se-resize hover:scale-125 transition-transform"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setResizingItem({ type: 'ref', id: ref.id, handle: 'se' });
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                          }}
                        />

                        {/* Rotate handle */}
                        <div
                          className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full cursor-pointer hover:scale-125 transition-transform flex items-center justify-center"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setRotatingItem({ type: 'ref', id: ref.id });
                          }}
                        >
                          <RotateCw className="w-3 h-3 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Labels with rotation and font size control */}
              {labels.map((label) => (
                <div
                  key={label.id}
                  onMouseDown={(e) => handleLabelMouseDown(label.id, e)}
                  className={`absolute cursor-move font-bold transition-shadow ${themeConfig.text.heading} ${selectedItems.has(label.id) ? 'ring-4 ring-emerald-500 bg-white bg-opacity-80 rounded-lg px-3 py-1' : 'bg-white bg-opacity-60 rounded px-2'}`}
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
                        onMouseDown={(e) => {
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
                        onMouseDown={(e) => {
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
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setRotatingItem({ type: 'label', id: label.id });
                        }}
                      >
                        <RotateCw className="w-3 h-3 text-white" />
                      </div>
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
                />
              ))}

              {tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-xs">
                    <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <GridIcon className="w-8 h-8 text-stone-400" />
                    </div>
                    <h3 className={`font-semibold mb-2 ${themeConfig.text.heading}`}>No tables yet</h3>
                    <p className="text-sm text-stone-500 mb-4">
                      Start building your seating chart by adding tables. You can choose from round, rectangular, and other shapes.
                    </p>
                    <button
                      onClick={() => setShowAddTable(true)}
                      className={`inline-flex items-center gap-2 text-sm ${themeConfig.button.primary}`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Your First Table
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mini-map */}
            {showMiniMap && tables.length > 0 && (
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-white border-2 border-stone-400 rounded-lg shadow-lg overflow-hidden pointer-events-none">
                <div className="relative w-full h-full bg-stone-100">
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-800 font-semibold">
                    Mini-map
                  </div>
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className="absolute bg-emerald-600 rounded-sm opacity-70"
                      style={{
                        left: `${(table.positionX / 1200) * 100}%`,
                        top: `${(table.positionY / 1000) * 100}%`,
                        width: '10px',
                        height: '10px',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Helper Text */}
          <details className="mt-3 text-xs text-stone-500">
            <summary className="cursor-pointer hover:text-stone-700 font-medium transition-colors">
              Keyboard shortcuts & tips
            </summary>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-4">
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">G</kbd> Toggle grid</p>
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">S</kbd> Toggle snap</p>
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">M</kbd> Toggle mini-map</p>
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">Del</kbd> Delete selected</p>
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">Esc</kbd> Deselect all</p>
              <p><kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600 font-mono">Shift+Click</kbd> Multi-select</p>
            </div>
          </details>
        </div>
      </div>

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

              <div className="flex gap-3 pt-4">
                <button type="submit" className={`flex-1 ${themeConfig.button.primary}`}>
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTable(false)}
                  className={themeConfig.button.secondary}
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
