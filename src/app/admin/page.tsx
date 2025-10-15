'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  LogOut,
  Settings,
  Users,
  Grid,
  Heart,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import SeatingChart from '@/components/admin/SeatingChart';
import GuestList from '@/components/admin/GuestList';
import EventSettings from '@/components/admin/EventSettings';
import UserManagement from '@/components/admin/UserManagement';

interface User {
  id: string;
  username: string;
}

type Tab = 'seating' | 'guests' | 'settings' | 'users';

export default function AdminPage() {
  const themeConfig = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('seating');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.user) {
        setUser(data.user);
      } else {
        router.push('/admin/login');
      }
    } catch {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-black">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'seating' as const, name: 'Seating Chart', icon: Grid },
    { id: 'guests' as const, name: 'Guest List', icon: Users },
    { id: 'settings' as const, name: 'Event Settings', icon: Settings },
    { id: 'users' as const, name: 'User Management', icon: ShieldCheck },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${themeConfig.icon.primary}`}>
                  <Heart className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-black">Event Admin</h1>
                  <p className="text-sm text-black">Welcome, {user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-black hover:text-amber-600 transition-colors"
                >
                  View Guest Portal
                </a>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-black hover:text-amber-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>

            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-yellow-500 text-amber-600'
                        : 'border-transparent text-black hover:text-amber-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'seating' && <SeatingChart />}
          {activeTab === 'guests' && <GuestList />}
          {activeTab === 'settings' && <EventSettings />}
          {activeTab === 'users' && <UserManagement />}
        </main>
      </div>
    </DndProvider>
  );
}