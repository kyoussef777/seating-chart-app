'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, Check, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useMediaQuery';
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
  // The card list and the table are both in the DOM (one hidden by CSS), so
  // autofocus has to go to whichever is actually visible.
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingUser>({ id: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (response.ok) {
          setUsers(data.users ?? []);
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

    fetchUsers();
  }, [toast]);

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
      <div className={themeConfig.loading.container}>
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${themeConfig.loading.spinner}`} />
        <p className={themeConfig.loading.text}>Loading users...</p>
      </div>
    );
  }

  const formatCreated = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`hidden md:block text-xl sm:text-2xl font-bold ${themeConfig.text.heading}`}>User Management</h2>
          <p className={`text-sm ${themeConfig.text.muted}`}>
            Manage admin users who can access the dashboard
          </p>
        </div>
        <button
          onClick={() => setAddingNew(true)}
          disabled={addingNew}
          className={`${themeConfig.button.primary} inline-flex items-center justify-center gap-2 disabled:opacity-50`}
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Phones: a card per user. The desktop table below cannot fit a narrow
          viewport without horizontal scrolling, which makes the row actions
          hard to reach. */}
      <div className="space-y-3 md:hidden">
        {addingNew && (
          <div className={`${themeConfig.card} space-y-3 border-2 border-emerald-200`}>
            <h3 className={`font-semibold ${themeConfig.text.heading}`}>New user</h3>
            <div>
              <label className={`block ${themeConfig.text.label} mb-1`} htmlFor="new-username">
                Username
              </label>
              <input
                id="new-username"
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                placeholder="At least 3 characters"
                className={themeConfig.input}
                autoFocus={isMobile}
              />
            </div>
            <div>
              <label className={`block ${themeConfig.text.label} mb-1`} htmlFor="new-password">
                Password
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="new-password"
                  type={showPassword['new'] ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  className={themeConfig.input}
                />
                <button
                  onClick={() => setShowPassword(prev => ({ ...prev, new: !prev['new'] }))}
                  aria-label={showPassword['new'] ? 'Hide password' : 'Show password'}
                  className={themeConfig.button.cancel}
                >
                  {showPassword['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddUser} className={`flex-1 ${themeConfig.button.primary}`}>
                Create user
              </button>
              <button
                onClick={() => {
                  setAddingNew(false);
                  setNewUser({ username: '', password: '' });
                }}
                className={`flex-1 ${themeConfig.button.secondary}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {users.map((user) => {
          const isEditing = editingUserId === user.id;

          return (
            <div
              key={user.id}
              className={cn(themeConfig.card, 'space-y-3', isEditing && 'border-2 border-emerald-200')}
            >
              {isEditing ? (
                <>
                  <div>
                    <label className={`block ${themeConfig.text.label} mb-1`}>Username</label>
                    <input
                      type="text"
                      value={editingData.username}
                      onChange={(e) => setEditingData(prev => ({ ...prev, username: e.target.value }))}
                      className={themeConfig.input}
                      autoFocus={isMobile}
                    />
                  </div>
                  <div>
                    <label className={`block ${themeConfig.text.label} mb-1`}>New password</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showPassword[user.id] ? 'text' : 'password'}
                        value={editingData.password}
                        onChange={(e) => setEditingData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave empty to keep current"
                        className={themeConfig.input}
                      />
                      <button
                        onClick={() => setShowPassword(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        aria-label={showPassword[user.id] ? 'Hide password' : 'Show password'}
                        className={themeConfig.button.cancel}
                      >
                        {showPassword[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className={`flex-1 ${themeConfig.button.primary}`}>
                      Save changes
                    </button>
                    <button onClick={handleCancelEdit} className={`flex-1 ${themeConfig.button.secondary}`}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 ${themeConfig.icon.color.secondary}`}>
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={`break-words font-medium ${themeConfig.text.body}`}>{user.username}</p>
                      <p className={`text-xs ${themeConfig.text.muted}`}>
                        Added {formatCreated(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(user)}
                      aria-label={`Edit ${user.username}`}
                      className={themeConfig.button.edit}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      aria-label={`Delete ${user.username}`}
                      className={themeConfig.button.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {users.length === 0 && !addingNew && (
          <div className={`${themeConfig.card} text-center ${themeConfig.text.muted}`}>
            No users found. Tap &ldquo;Add User&rdquo; to create one.
          </div>
        )}
      </div>

      {/* Desktop: spreadsheet-style table */}
      <div className={`hidden md:block ${themeConfig.classes.bgCard} rounded-2xl shadow-lg overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className={`${themeConfig.theme.secondary[50]} border-b ${themeConfig.classes.borderDefault}`}>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/3 ${themeConfig.text.muted}`}>
                Username
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/3 ${themeConfig.text.muted}`}>
                Password
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/4 ${themeConfig.text.muted}`}>
                Created At
              </th>
              <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider w-24 ${themeConfig.text.muted}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {/* Add new user row */}
            {addingNew && (
              <tr className={themeConfig.theme.secondary[100]}>
                <td className="px-6 py-3">
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    className={`${themeConfig.input} w-full`}
                    autoFocus={!isMobile}
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
                      className={themeConfig.button.cancel}
                    >
                      {showPassword['new'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
                <td className={`px-6 py-3 text-sm ${themeConfig.text.muted}`}>
                  New user
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleAddUser}
                      className={themeConfig.button.confirm}
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setAddingNew(false);
                        setNewUser({ username: '', password: '' });
                      }}
                      className={themeConfig.button.delete}
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
                  className={`transition-colors hover:bg-stone-50 hover:border-stone-300 ${isEditing ? 'bg-stone-100' : ''}`}
                >
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingData.username}
                        onChange={(e) => setEditingData(prev => ({ ...prev, username: e.target.value }))}
                        className={`${themeConfig.input} w-full`}
                        autoFocus={!isMobile}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${themeConfig.text.body}`}>{user.username}</span>
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
                          className={themeConfig.button.cancel}
                        >
                          {showPassword[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className={`text-sm ${themeConfig.text.muted}`}>••••••••</span>
                    )}
                  </td>
                  <td className={`px-6 py-3 text-sm ${themeConfig.text.muted}`}>
                    {formatCreated(user.createdAt)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className={themeConfig.button.confirm}
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={themeConfig.button.cancel}
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(user)}
                            className={themeConfig.button.edit}
                            title="Edit user"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className={themeConfig.button.delete}
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
                <td colSpan={4} className={`px-6 py-12 text-center ${themeConfig.text.muted}`}>
                  No users found. Click &ldquo;Add User&rdquo; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`text-sm ${themeConfig.text.muted}`}>
        <p>• Password requirements: Minimum 8 characters</p>
        <p>• Username requirements: Minimum 3 characters, must be unique</p>
        <p>• Cannot delete the last admin user</p>
      </div>
    </div>
  );
}
