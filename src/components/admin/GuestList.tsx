'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Search, Edit, Trash2, User, Phone, MapPin } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  tableId: string | null;
}

interface Table {
  id: string;
  name: string;
}

export default function GuestList() {
  const { button, input, text } = useTheme();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newGuest, setNewGuest] = useState({
    name: '',
    phoneNumber: '',
    address: '',
    tableId: '',
  });

  useEffect(() => {
    fetchGuests();
    fetchTables();
  }, []);

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
          tableId: newGuest.tableId || null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setGuests(prev => [...prev, data.guest]);
        setNewGuest({ name: '', phoneNumber: '', address: '', tableId: '' });
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
          alert(`Imported ${data.imported} guests successfully. ${data.invalidRows.length} rows were skipped due to errors.`);
        } else {
          alert(`Successfully imported ${data.imported} guests!`);
        }
      } else {
        alert(`Import failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to import guests:', error);
      alert('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return 'Unassigned';
    const table = tables.find(t => t.id === tableId);
    return table?.name || 'Unknown Table';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className={text.body}>Loading guest list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={`text-2xl ${text.heading}`}>Guest Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className={`inline-flex items-center gap-2 ${button.secondary}`}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddGuest(true)}
            className={`inline-flex items-center gap-2 ${button.primary}`}
          >
            <Plus className="w-4 h-4" />
            Add Guest
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search guests by name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${input} pl-10 pr-4`}
          />
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className={`text-lg font-semibold ${text.body}`}>
            Guests ({filteredGuests.length} of {guests.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredGuests.map((guest) => (
            <div key={guest.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <h4 className={`text-lg font-medium ${text.body}`}>{guest.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      guest.tableId
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getTableName(guest.tableId)}
                    </span>
                  </div>
                  <div className={`flex items-center gap-6 text-sm ${text.body}`}>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingGuest(guest)}
                    className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGuest(guest.id)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredGuests.length === 0 && (
            <div className={`p-12 text-center ${text.muted}`}>
              {searchTerm ? 'No guests found matching your search.' : 'No guests added yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Guest</h3>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className={`block ${text.label} mb-1`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  className={input}
                  required
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newGuest.phoneNumber}
                  onChange={(e) => setNewGuest({ ...newGuest, phoneNumber: e.target.value })}
                  className={input}
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Address
                </label>
                <textarea
                  value={newGuest.address}
                  onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                  className={`${input} h-20`}
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Assign to Table
                </label>
                <select
                  value={newGuest.tableId}
                  onChange={(e) => setNewGuest({ ...newGuest, tableId: e.target.value })}
                  className={input}
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
                  className={`flex-1 ${button.primary}`}
                >
                  Add Guest
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGuest(false)}
                  className={button.secondary}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Guest</h3>
            <form onSubmit={handleEditGuest} className="space-y-4">
              <div>
                <label className={`block ${text.label} mb-1`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={editingGuest.name}
                  onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                  className={input}
                  required
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editingGuest.phoneNumber || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, phoneNumber: e.target.value })}
                  className={input}
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Address
                </label>
                <textarea
                  value={editingGuest.address || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, address: e.target.value })}
                  className={`${input} h-20`}
                />
              </div>

              <div>
                <label className={`block ${text.label} mb-1`}>
                  Assign to Table
                </label>
                <select
                  value={editingGuest.tableId || ''}
                  onChange={(e) => setEditingGuest({ ...editingGuest, tableId: e.target.value || null })}
                  className={input}
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
                  className={`flex-1 ${button.primary}`}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className={button.secondary}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Import Guest List</h3>
            <div className="space-y-4">
              <div>
                <p className={`text-sm ${text.muted} mb-4`}>
                  Upload a CSV file with columns: <strong>name</strong>, <strong>phoneNumber</strong>, <strong>address</strong>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className={input}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className={`flex-1 ${button.secondary}`}
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