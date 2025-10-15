'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, Check, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/contexts/ToastContext';

interface User {
  id: string;
  username: string;
  createdAt: string;
}

interface EditingUser {
  id: string;
  username: string;
  password: string;
}

export default function UserManagement() {
  const themeConfig = useTheme();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingUser>({ id: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = useCallback((user: User) => {
    setEditingUserId(user.id);
    setEditingData({ id: user.id, username: user.username, password: '' });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditingData({ id: '', username: '', password: '' });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingData.username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    try {
      const body: { id: string; username: string; password?: string } = {
        id: editingData.id,
        username: editingData.username,
      };

      // Only include password if it was changed
      if (editingData.password) {
        body.password = editingData.password;
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === data.user.id ? data.user : u));
        setEditingUserId(null);
        setEditingData({ id: '', username: '', password: '' });
        toast.success(editingData.password ? 'User updated with new password' : 'Username updated');
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('Failed to save user');
    }
  }, [editingData, toast]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast.success('User deleted successfully');
      } else {
        // Try to parse JSON error, fallback to text
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to delete user';

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text);
        }

        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user. Please try again.');
    }
  }, [toast]);

  const handleAddUser = useCallback(async () => {
    if (!newUser.username.trim() || !newUser.password) {
      toast.error('Username and password are required');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev => [...prev, data.user]);
        setAddingNew(false);
        setNewUser({ username: '', password: '' });
        toast.success('User created successfully');
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      toast.error('Failed to add user');
    }
  }, [newUser, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${themeConfig.text.heading}`}>User Management</h2>
          <p className="text-gray-600 mt-1">Manage admin users who can access the dashboard</p>
        </div>
        <button
          onClick={() => setAddingNew(true)}
          className={`${themeConfig.button.primary} flex items-center gap-2`}
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Excel-like table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/3">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/3">
                Password
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">
                Created At
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Add new user row */}
            {addingNew && (
              <tr className="bg-blue-50">
                <td className="px-6 py-3">
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    className={`${themeConfig.input} w-full`}
                    autoFocus
                  />
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type={showPassword['new'] ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password (min 8 chars)"
                      className={`${themeConfig.input} flex-1`}
                    />
                    <button
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev['new'] }))}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">
                  New user
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleAddUser}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAddingNew(false);
                        setNewUser({ username: '', password: '' });
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing users */}
            {users.map((user) => {
              const isEditing = editingUserId === user.id;

              return (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 transition-colors ${isEditing ? 'bg-yellow-50' : ''}`}
                >
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingData.username}
                        onChange={(e) => setEditingData(prev => ({ ...prev, username: e.target.value }))}
                        className={`${themeConfig.input} w-full`}
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type={showPassword[user.id] ? 'text' : 'password'}
                          value={editingData.password}
                          onChange={(e) => setEditingData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Leave empty to keep current"
                          className={`${themeConfig.input} flex-1`}
                        />
                        <button
                          onClick={() => setShowPassword(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">••••••••</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Edit user"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && !addingNew && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No users found. Click &ldquo;Add User&rdquo; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>• Password requirements: Minimum 8 characters</p>
        <p>• Username requirements: Minimum 3 characters, must be unique</p>
        <p>• Cannot delete the last admin user</p>
      </div>
    </div>
  );
}
