'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Search, Edit, Trash2, User, Phone, MapPin, Users } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  partySize: number;
  tableId: string | null;
}

interface Table {
  id: string;
  name: string;
}

export default function GuestList() {
  const themeConfig = useTheme();
  const toast = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newGuest, setNewGuest] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    partySize: 1,
    tableId: '',
  });

  useEffect(() => {
    fetchGuests();
    fetchTables();
  }, []);

  // Close bulk actions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBulkActions) {
        const target = event.target as HTMLElement;
        if (!target.closest('.bulk-actions-dropdown')) {
          setShowBulkActions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBulkActions]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredGuests(
        guests.filter(guest =>
          guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (guest.phoneNumber && guest.phoneNumber.includes(searchTerm)) ||
          (guest.address && guest.address.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    } else {
      setFilteredGuests(guests);
    }
  }, [guests, searchTerm]);

  const fetchGuests = async () => {
    try {
      const response = await fetch('/api/guests');
      const data = await response.json();
      if (response.ok) {
        setGuests(data.guests);
      }
    } catch (error) {
      console.error('Failed to fetch guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuest.name.trim()) return;

    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGuest.name.trim(),
          phoneNumber: newGuest.phoneNumber.trim() || null,
          address: newGuest.address.trim() || null,
          partySize: newGuest.partySize || 1,
          tableId: newGuest.tableId || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGuests(prev => [...prev, data.guest]);
        setNewGuest({ name: '', phoneNumber: '', address: '', partySize: 1, tableId: '' });
        setShowAddGuest(false);
      }
    } catch (error) {
      console.error('Failed to add guest:', error);
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !editingGuest.name.trim()) return;

    try {
      const response = await fetch('/api/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingGuest.id,
          name: editingGuest.name.trim(),
          phoneNumber: editingGuest.phoneNumber?.trim() || null,
          address: editingGuest.address?.trim() || null,
          partySize: editingGuest.partySize || 1,
          tableId: editingGuest.tableId || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGuests(prev =>
          prev.map(guest => guest.id === editingGuest.id ? data.guest : guest)
        );
        setEditingGuest(null);
      }
    } catch (error) {
      console.error('Failed to edit guest:', error);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;

    try {
      const response = await fetch(`/api/guests?id=${guestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGuests(prev => prev.filter(guest => guest.id !== guestId));
      }
    } catch (error) {
      console.error('Failed to delete guest:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await fetch('/api/guests/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setGuests(prev => [...prev, ...data.guests]);
        setShowImport(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        if (data.invalidRows?.length > 0) {
          toast.warning(`Imported ${data.imported} guests successfully. ${data.invalidRows.length} rows were skipped due to errors.`);
        } else {
          toast.success(`Successfully imported ${data.imported} guests!`);
        }
      } else {
        toast.error(`Import failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to import guests:', error);
      toast.error('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return 'Unassigned';
    const table = tables.find(t => t.id === tableId);
    return table?.name || 'Unknown Table';
  };

  // Calculate total people count (sum of party sizes)
  const getTotalPeople = (guestList: Guest[]) => {
    return guestList.reduce((sum, guest) => sum + guest.partySize, 0);
  };

  // Multi-select handlers
  const toggleSelectGuest = (guestId: string) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  const selectAllGuests = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    }
  };

  // Bulk delete selected guests
  const handleBulkDelete = async () => {
    if (selectedGuests.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedGuests.size} selected guest(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedGuests).map(guestId =>
        fetch(`/api/guests?id=${guestId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      toast.success(`Deleted ${selectedGuests.size} guest(s) successfully`);
      setSelectedGuests(new Set());
      fetchGuests();
    } catch (error) {
      toast.error('Failed to delete some guests');
    }
  };

  // Bulk assign to table
  const handleBulkAssign = async (tableId: string) => {
    if (selectedGuests.size === 0) return;

    try {
      const updatePromises = Array.from(selectedGuests).map(guestId => {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) return Promise.resolve();

        return fetch('/api/guests', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: guestId, tableId: tableId || null }),
        });
      });

      await Promise.all(updatePromises);
      toast.success(`Assigned ${selectedGuests.size} guest(s) to table`);
      setSelectedGuests(new Set());
      setShowBulkActions(false);
      fetchGuests();
    } catch (error) {
      toast.error('Failed to assign some guests');
    }
  };

  if (loading) {
    return (
      <div className={themeConfig.loading.container}>
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${themeConfig.loading.spinner}`} />
        <p className={themeConfig.loading.text}>Loading guest list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl ${themeConfig.text.heading}`}>Guest Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className={`inline-flex items-center gap-2 ${themeConfig.button.secondary}`}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddGuest(true)}
            className={`inline-flex items-center gap-2 ${themeConfig.button.primary}`}
          >
            <Plus className="w-4 h-4" />
            Add Guest
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={themeConfig.card}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${themeConfig.icon.color.secondary}`} />
          <input
            type="text"
            placeholder="Search guests by name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${themeConfig.input} pl-10 pr-4`}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedGuests.size > 0 && (
        <div className={`${themeConfig.card} bg-emerald-50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`font-medium ${themeConfig.text.body}`}>
                {selectedGuests.size} guest(s) selected ({getTotalPeople(guests.filter(g => selectedGuests.has(g.id)))}{' '}
                people)
              </span>
              <button
                onClick={() => setSelectedGuests(new Set())}
                className={themeConfig.button.tertiary}
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative bulk-actions-dropdown">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={themeConfig.button.secondary}
                >
                  Assign to Table
                </button>
                {showBulkActions && (
                  <div className={`absolute right-0 mt-2 w-48 ${themeConfig.classes.bgCard} ${themeConfig.classes.borderDefault} rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto`}>
                    <div className="py-1">
                      <button
                        onClick={() => handleBulkAssign('')}
                        className={`w-full text-left px-4 py-2 ${themeConfig.text.body} hover:bg-stone-50`}
                      >
                        Unassign
                      </button>
                      {tables.map(table => (
                        <button
                          key={table.id}
                          onClick={() => handleBulkAssign(table.id)}
                          className={`w-full text-left px-4 py-2 ${themeConfig.text.body} hover:bg-stone-50`}
                        >
                          {table.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleBulkDelete}
                className={themeConfig.button.danger}
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest List */}
      <div className={themeConfig.card}>
        <div className={`px-6 py-4 border-b ${themeConfig.classes.borderDefault} flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedGuests.size > 0 && selectedGuests.size === filteredGuests.length}
              onChange={selectAllGuests}
              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <h3 className={`text-lg font-semibold ${themeConfig.text.body}`}>
              Guests: {filteredGuests.length} entries ({getTotalPeople(filteredGuests)} people) of {guests.length} entries ({getTotalPeople(guests)} total people)
            </h3>
          </div>
        </div>
        <div className={`divide-y ${themeConfig.classes.borderDefault}`}>
          {filteredGuests.map((guest) => (
            <div key={guest.id} className={themeConfig.listItem.default}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedGuests.has(guest.id)}
                    onChange={() => toggleSelectGuest(guest.id)}
                    className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className={`w-5 h-5 ${themeConfig.icon.color.secondary}`} />
                      <h4 className={`text-lg font-medium ${themeConfig.text.body}`}>{guest.name}</h4>
                      {guest.partySize > 1 && (
                        <span className={`${themeConfig.badge.partySize} flex items-center gap-1`}>
                          <Users className="w-3 h-3" />
                          {guest.partySize}
                        </span>
                      )}
                      <span className={guest.tableId ? themeConfig.badge.assigned : themeConfig.badge.unassigned}>
                        {getTableName(guest.tableId)}
                      </span>
                    </div>
                    <div className={`flex items-center gap-6 text-sm ${themeConfig.text.body}`}>
                      {guest.phoneNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{guest.phoneNumber}</span>
                        </div>
                      )}
                      {guest.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate max-w-xs">{guest.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingGuest(guest)}
                    className={themeConfig.button.edit}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGuest(guest.id)}
                    className={themeConfig.button.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredGuests.length === 0 && (
            <div className={`p-12 text-center ${themeConfig.text.muted}`}>
              {searchTerm ? 'No guests found matching your search.' : 'No guests added yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className={themeConfig.modal.overlay}>
          <div className={themeConfig.modal.container}>
            <h3 className={themeConfig.modal.title}>Add New Guest</h3>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  className={themeConfig.input}
                  required
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newGuest.phoneNumber}
                  onChange={(e) => setNewGuest({ ...newGuest, phoneNumber: e.target.value })}
                  className={themeConfig.input}
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Address
                </label>
                <textarea
                  value={newGuest.address}
                  onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                  className={`${themeConfig.input} h-20`}
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Party Size *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newGuest.partySize}
                  onChange={(e) => setNewGuest({ ...newGuest, partySize: parseInt(e.target.value) || 1 })}
                  className={themeConfig.input}
                  required
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Assign to Table
                </label>
                <select
                  value={newGuest.tableId}
                  onChange={(e) => setNewGuest({ ...newGuest, tableId: e.target.value })}
                  className={themeConfig.input}
                >
                  <option value="">Unassigned</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 ${themeConfig.button.primary}`}
                >
                  Add Guest
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGuest(false)}
                  className={themeConfig.button.secondary}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Guest Modal */}
      {editingGuest && (
        <div className={themeConfig.modal.overlay}>
          <div className={themeConfig.modal.container}>
            <h3 className={themeConfig.modal.title}>Edit Guest</h3>
            <form onSubmit={handleEditGuest} className="space-y-4">
              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={editingGuest.name}
                  onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                  className={themeConfig.input}
                  required
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editingGuest.phoneNumber || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, phoneNumber: e.target.value })}
                  className={themeConfig.input}
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Address
                </label>
                <textarea
                  value={editingGuest.address || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, address: e.target.value })}
                  className={`${themeConfig.input} h-20`}
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Party Size *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingGuest.partySize}
                  onChange={(e) => setEditingGuest({ ...editingGuest, partySize: parseInt(e.target.value) || 1 })}
                  className={themeConfig.input}
                  required
                />
              </div>

              <div>
                <label className={`block ${themeConfig.text.label} mb-1`}>
                  Assign to Table
                </label>
                <select
                  value={editingGuest.tableId || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, tableId: e.target.value || null })}
                  className={themeConfig.input}
                >
                  <option value="">Unassigned</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 ${themeConfig.button.primary}`}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className={themeConfig.button.secondary}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className={themeConfig.modal.overlay}>
          <div className={themeConfig.modal.container}>
            <h3 className={themeConfig.modal.title}>Import Guest List</h3>
            <div className="space-y-4">
              <div>
                <p className={`text-sm ${themeConfig.text.muted} mb-4`}>
                  Upload a CSV file with columns: <strong>name</strong>, <strong>phoneNumber</strong>, <strong>address</strong>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className={themeConfig.input}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className={`flex-1 ${themeConfig.button.secondary}`}
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