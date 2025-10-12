'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { Plus, Edit, Trash2, Users, Grid, ZoomIn, ZoomOut, RotateCcw, Move, Shuffle, Search } from 'lucide-react';
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

export default function SeatingChart() {
  const themeConfig = useTheme();
  const [tables, setTables] = useState<Table[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const [showAddTable, setShowAddTable] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    shape: 'round',
    capacity: 8,
  });

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

  // Helper function to calculate seats used by guests (accounting for party size)
  const getSeatsUsed = (guests: Guest[]) => {
    return guests.reduce((total, guest) => total + (guest.partySize || 1), 0);
  };

  // Helper function to get available seats at a table
  const getAvailableSeats = (table: Table) => {
    return table.capacity - getSeatsUsed(table.guests);
  };
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
    fetchTablesAndGuests();
  }, []);

  useEffect(() => {
    if (guestSearchTerm.trim()) {
      setFilteredGuests(
        unassignedGuests.filter(guest =>
          guest.name.toLowerCase().includes(guestSearchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredGuests(unassignedGuests);
    }
  }, [unassignedGuests, guestSearchTerm]);

  const fetchTablesAndGuests = useCallback(async () => {
    try {
      // Fetch both tables and guests in parallel
      const [tablesResponse, guestsResponse] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/guests')
      ]);

      const [tablesData, guestsData] = await Promise.all([
        tablesResponse.json(),
        guestsResponse.json()
      ]);

      if (tablesResponse.ok && guestsResponse.ok) {
        // Group guests by table
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

        // Attach guests to tables
        const tablesWithGuests = tablesData.tables.map((table: Table) => ({
          ...table,
          rotation: table.rotation || 0, // Ensure rotation defaults to 0
          guests: guestsByTable[table.id] || []
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
    // Re-fetch all data to ensure consistency
    try {
      const [tablesResponse, guestsResponse] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/guests')
      ]);

      const [tablesData, guestsData] = await Promise.all([
        tablesResponse.json(),
        guestsResponse.json()
      ]);

      if (tablesResponse.ok && guestsResponse.ok) {
        // Group guests by table
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

        // Attach guests to tables
        const tablesWithGuests = tablesData.tables.map((table: Table) => ({
          ...table,
          rotation: table.rotation || 0, // Ensure rotation defaults to 0
          guests: guestsByTable[table.id] || []
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
          positionX: Math.random() * 400 + 50,
          positionY: Math.random() * 300 + 50,
          rotation: 0,
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
        await refreshData(); // Refresh all data
      }
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  const handleAssignGuest = useCallback(async (guestId: string, tableId: string) => {
    const guest = unassignedGuests.find(g => g.id === guestId);
    const table = tables.find(t => t.id === tableId);

    if (!guest || !table) return;

    // Check if there's enough capacity for this party
    const availableSeats = getAvailableSeats(table);
    const partySize = guest.partySize || 1;

    if (availableSeats < partySize) {
      alert(`Not enough space! This party needs ${partySize} seats but only ${availableSeats} are available.`);
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
        // Move guest from unassigned to the table
        setUnassignedGuests(prev => prev.filter(g => g.id !== guestId));
        setTables(prev =>
          prev.map(t =>
            t.id === tableId
              ? { ...t, guests: [...t.guests, { ...guest, tableId }] }
              : t
          )
        );
        // Refresh data to ensure consistency
        setTimeout(refreshData, 200);
      }
    } catch (error) {
      console.error('Failed to assign guest:', error);
      // Refresh on error to get correct state
      setTimeout(refreshData, 200);
    }
  }, [unassignedGuests, tables, refreshData]);

  const handleUnassignGuest = useCallback(async (guestId: string) => {
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
        // Refresh data to ensure consistency
        setTimeout(refreshData, 200);
      }
    } catch (error) {
      console.error('Failed to unassign guest:', error);
      // Refresh on error to get correct state
      setTimeout(refreshData, 200);
    }
  }, [refreshData]);

  const handleRotateTable = useCallback(async (tableId: string, rotation: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Optimistically update state first
    setTables(prev =>
      prev.map(t =>
        t.id === tableId
          ? { ...t, rotation }
          : t
      )
    );

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
        // Revert on error
        setTables(prev =>
          prev.map(t =>
            t.id === tableId
              ? { ...t, rotation: table.rotation || 0 }
              : t
          )
        );
      }
    } catch (error) {
      console.error('Failed to rotate table:', error);
      // Revert on error
      setTables(prev =>
        prev.map(t =>
          t.id === tableId
            ? { ...t, rotation: table.rotation || 0 }
            : t
        )
      );
    }
  }, [tables]);

  const handleAutoArrange = useCallback(() => {
    if (tables.length === 0) return;

    const canvasWidth = 800;
    const canvasHeight = 600;
    const tableSpacing = 180;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    let arrangedTables;

    if (tables.length === 1) {
      // Single table in center
      arrangedTables = [{
        ...tables[0],
        positionX: centerX - 50,
        positionY: centerY - 50
      }];
    } else {
      // Arrange in circle around center
      const radius = Math.min(canvasWidth, canvasHeight) * 0.3;
      arrangedTables = tables.map((table, index) => {
        const angle = (index * 2 * Math.PI) / tables.length;
        return {
          ...table,
          positionX: centerX + radius * Math.cos(angle) - 50,
          positionY: centerY + radius * Math.sin(angle) - 50
        };
      });
    }

    setTables(arrangedTables);

    // Update positions on server
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
  }, [tables]);

  const handleBulkAssign = useCallback(async () => {
    if (unassignedGuests.length === 0 || tables.length === 0) return;

    const updatedTables = [...tables];
    let guestIndex = 0;

    // Auto-assign guests to tables with available capacity (accounting for party size)
    for (const table of updatedTables) {
      let availableSeats = getAvailableSeats(table);

      while (guestIndex < unassignedGuests.length && availableSeats > 0) {
        const guest = unassignedGuests[guestIndex];
        const partySize = guest.partySize || 1;

        // Only assign if the party fits
        if (partySize <= availableSeats) {
          try {
            const response = await fetch('/api/guests', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: guest.id,
                tableId: table.id,
              }),
            });

            if (response.ok) {
              table.guests.push({ ...guest, tableId: table.id });
              availableSeats -= partySize;
            }
          } catch (error) {
            console.error('Failed to assign guest:', error);
          }
        }

        guestIndex++;
      }

      if (guestIndex >= unassignedGuests.length) break;
    }

    // Refresh data to ensure consistency
    setTimeout(refreshData, 200);
    setShowBulkAssign(false);
  }, [tables, unassignedGuests, refreshData]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${themeConfig.classes.borderPrimary}`} />
        <p className={themeConfig.text.body}>Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Seating Chart</h2>
        <div className="flex gap-2">
          <button
            onClick={handleAutoArrange}
            disabled={tables.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Auto-arrange tables"
          >
            <Shuffle className="w-4 h-4" />
            Auto Arrange
          </button>
          <button
            onClick={() => setShowBulkAssign(true)}
            disabled={unassignedGuests.length === 0 || tables.length === 0}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${themeConfig.button.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Bulk assign guests"
          >
            <Users className="w-4 h-4" />
            Bulk Assign
          </button>
          <button
            onClick={() => setShowAddTable(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${themeConfig.button.primary}`}
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Unassigned Guests */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-black mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Unassigned Guests ({unassignedGuests.length})
          </h3>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search guests..."
                value={guestSearchTerm}
                onChange={(e) => setGuestSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredGuests.map((guest) => (
              <DraggableGuest
                key={guest.id}
                guest={guest}
                onUnassign={() => handleUnassignGuest(guest.id)}
              />
            ))}
            {filteredGuests.length === 0 && unassignedGuests.length > 0 && (
              <p className="text-black text-sm">No guests found matching "{guestSearchTerm}"</p>
            )}
            {unassignedGuests.length === 0 && (
              <p className="text-black text-sm">All guests are assigned!</p>
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
            <span className="text-sm font-medium text-black min-w-[3rem] text-center">
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
            <div className="flex items-center gap-1 text-sm text-black ml-4">
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
                  onRotate={handleRotateTable}
                />
              ))}
              {tables.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-black">
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
                  onChange={(e) => {
                    const newShape = e.target.value;
                    setNewTable({
                      ...newTable,
                      shape: newShape,
                      capacity: getDefaultCapacity(newShape)
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-lg ${themeConfig.input}`}
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

      {/* Bulk Assignment Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">Bulk Assign Guests</h3>
            <div className="space-y-4">
              <p className="text-sm text-black">
                This will automatically assign {unassignedGuests.length} unassigned guests to available tables based on capacity.
              </p>
              <div className="space-y-2">
                {tables.map(table => {
                  const seatsUsed = getSeatsUsed(table.guests);
                  const availableSeats = table.capacity - seatsUsed;
                  return (
                    <div key={table.id} className="flex justify-between text-sm text-black">
                      <span className="font-medium">{table.name}</span>
                      <span className={availableSeats > 0 ? 'text-green-600' : 'text-red-600'}>
                        {availableSeats > 0 ? `${availableSeats}/${table.capacity} seats available` : 'Full'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBulkAssign}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${themeConfig.button.primary}`}
                >
                  Assign Guests
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAssign(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${themeConfig.button.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}