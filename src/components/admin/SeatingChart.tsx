'use client';

import { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { Plus, Edit, Trash2, Users, Grid, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import DraggableTable from './DraggableTable';
import DraggableGuest from './DraggableGuest';

interface Table {
  id: string;
  name: string;
  shape: string;
  capacity: number;
  positionX: number;
  positionY: number;
  guests: Guest[];
}

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  tableId: string | null;
}

export default function SeatingChart() {
  const themeConfig = useTheme();
  const [tables, setTables] = useState<Table[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    shape: 'round',
    capacity: 8,
  });
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop(() => ({
    accept: ['table', 'guest'],
    drop: (item: any, monitor) => {
      console.log('Drop event:', item, 'didDrop:', monitor.didDrop());
      if (!monitor.didDrop() && item.type === 'table') {
        const dropOffset = monitor.getClientOffset();
        const canvasRect = chartRef.current?.getBoundingClientRect();

        console.log('Drop offset:', dropOffset, 'Canvas rect:', canvasRect);

        if (dropOffset && canvasRect) {
          // Calculate position accounting for zoom and pan
          const x = Math.max(0, (dropOffset.x - canvasRect.left - panOffset.x) / zoomLevel - 50);
          const y = Math.max(0, (dropOffset.y - canvasRect.top - panOffset.y) / zoomLevel - 40);
          console.log('Setting table position to:', x, y, 'Zoom:', zoomLevel, 'Pan:', panOffset);
          handleSetTablePosition(item.id, x, y);
        }
      }
    },
  }));

  useEffect(() => {
    fetchTables();
    fetchGuests();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await fetch('/api/guests');
      const data = await response.json();
      if (response.ok) {
        const unassigned = data.guests.filter((guest: Guest) => !guest.tableId);
        setUnassignedGuests(unassigned);
      }
    } catch (error) {
      console.error('Failed to fetch guests:', error);
    }
  };

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
          positionX: Math.random() * 400 + 50,
          positionY: Math.random() * 300 + 50,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTables(prev => [...prev, data.table]);
        setNewTable({ name: '', shape: 'round', capacity: 8 });
        setShowAddTable(false);
      }
    } catch (error) {
      console.error('Failed to add table:', error);
    }
  };

  const handleMoveTable = async (tableId: string, deltaX: number, deltaY: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const newX = Math.max(0, table.positionX + deltaX);
    const newY = Math.max(0, table.positionY + deltaY);

    try {
      const response = await fetch('/api/tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tableId,
          positionX: newX,
          positionY: newY,
        }),
      });

      if (response.ok) {
        setTables(prev =>
          prev.map(t =>
            t.id === tableId
              ? { ...t, positionX: newX, positionY: newY }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to move table:', error);
    }
  };

  const handleSetTablePosition = async (tableId: string, newX: number, newY: number) => {
    try {
      const response = await fetch('/api/tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tableId,
          positionX: newX,
          positionY: newY,
        }),
      });

      if (response.ok) {
        setTables(prev =>
          prev.map(t =>
            t.id === tableId
              ? { ...t, positionX: newX, positionY: newY }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to set table position:', error);
    }
  };

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2)); // Max 200%
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.3)); // Min 30%
  };

  const handleResetZoom = () => {
    setZoomLevel(0.7);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+click
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.3, Math.min(2, prev + delta)));
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
        setTables(prev => prev.filter(t => t.id !== tableId));
        await fetchGuests(); // Refresh unassigned guests
      }
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  const handleAssignGuest = async (guestId: string, tableId: string) => {
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
        // Move guest from unassigned to the table
        const guest = unassignedGuests.find(g => g.id === guestId);
        if (guest) {
          setUnassignedGuests(prev => prev.filter(g => g.id !== guestId));
          setTables(prev =>
            prev.map(table =>
              table.id === tableId
                ? { ...table, guests: [...table.guests, { ...guest, tableId }] }
                : table
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to assign guest:', error);
    }
  };

  const handleUnassignGuest = async (guestId: string) => {
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
        // Move guest from table to unassigned
        let removedGuest: Guest | null = null;
        setTables(prev =>
          prev.map(table => {
            const guest = table.guests.find(g => g.id === guestId);
            if (guest) {
              removedGuest = { ...guest, tableId: null };
              return { ...table, guests: table.guests.filter(g => g.id !== guestId) };
            }
            return table;
          })
        );

        if (removedGuest) {
          setUnassignedGuests(prev => [...prev, removedGuest!]);
        }
      }
    } catch (error) {
      console.error('Failed to unassign guest:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-black">Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Seating Chart</h2>
        <button
          onClick={() => setShowAddTable(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${themeConfig.button.primary}`}
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Unassigned Guests */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Unassigned Guests ({unassignedGuests.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unassignedGuests.map((guest) => (
              <DraggableGuest
                key={guest.id}
                guest={guest}
                onUnassign={() => handleUnassignGuest(guest.id)}
              />
            ))}
            {unassignedGuests.length === 0 && (
              <p className="text-gray-500 text-sm">All guests are assigned!</p>
            )}
          </div>
        </div>

        {/* Seating Chart Canvas */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-100 rounded-lg">
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-1 px-3 py-1 bg-white rounded border hover:bg-gray-50 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
              <span className="text-sm">-</span>
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="flex items-center gap-1 px-3 py-1 bg-white rounded border hover:bg-gray-50 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
              <span className="text-sm">+</span>
            </button>
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1 px-3 py-1 bg-white rounded border hover:bg-gray-50 transition-colors"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Reset</span>
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-500 ml-4">
              <Move className="w-4 h-4" />
              <span>Ctrl+scroll to zoom, middle-click to pan</span>
            </div>
          </div>

          <div
            ref={(el) => {
              chartRef.current = el;
              drop(el);
            }}
            className="relative bg-gray-50 rounded-lg min-h-[600px] border-2 border-dashed border-gray-300 overflow-hidden cursor-move"
            style={{ position: 'relative' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                minHeight: '600px',
                position: 'relative',
              }}
            >
              {tables.map((table) => (
                <DraggableTable
                  key={table.id}
                  table={table}
                  onDelete={() => handleDeleteTable(table.id)}
                  onAssignGuest={handleAssignGuest}
                  onUnassignGuest={handleUnassignGuest}
                />
              ))}
              {tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Grid className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tables yet. Click "Add Table" to get started.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">Add New Table</h3>
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Table Name
                </label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="e.g., Table 1, Head Table, etc."
                  className={`w-full px-3 py-2 rounded-lg ${themeConfig.input}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Table Shape
                </label>
                <select
                  value={newTable.shape}
                  onChange={(e) => setNewTable({ ...newTable, shape: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg ${themeConfig.input}`}
                >
                  <option value="round">Round</option>
                  <option value="rectangular">Rectangular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg ${themeConfig.input}`}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${themeConfig.button.primary}`}
                >
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTable(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${themeConfig.button.secondary}`}
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