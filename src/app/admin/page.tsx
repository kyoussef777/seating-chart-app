'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  LogOut,
  Settings,
  Users,
  Grid,
  Heart,
  ShieldCheck,
  ClipboardList,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import SeatingChart from '@/components/admin/SeatingChart';
import GuestList from '@/components/admin/GuestList';
import EventSettings from '@/components/admin/EventSettings';
import UserManagement from '@/components/admin/UserManagement';
import RosterView from '@/components/admin/RosterView';

interface User {
  id: string;
  username: string;
}

type Tab = 'seating' | 'roster' | 'guests' | 'settings' | 'users';

/** `short` labels keep the mobile bottom bar readable at 5 items wide. */
const TABS = [
  { id: 'seating' as const, name: 'Seating Chart', short: 'Chart', icon: Grid },
  { id: 'roster' as const, name: 'Roster', short: 'Roster', icon: ClipboardList },
  { id: 'guests' as const, name: 'Guest List', short: 'Guests', icon: Users },
  { id: 'settings' as const, name: 'Event Settings', short: 'Settings', icon: Settings },
  { id: 'users' as const, name: 'User Management', short: 'Users', icon: ShieldCheck },
];

export default function AdminPage() {
  const themeConfig = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('seating');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
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

    checkAuth();
  }, [router]);

  // Dismiss the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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
      <div className={themeConfig.loading.container}>
        <div className="text-center">
          <div className={`w-8 h-8 border-4 ${themeConfig.loading.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
          <p className={themeConfig.loading.text}>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`min-h-screen ${themeConfig.theme.components.page.beige}`}>
        <header className={themeConfig.header.container}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 py-3 sm:py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 ${themeConfig.icon.primary}`}>
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  {/* On phones the title doubles as a "you are here" cue, since
                      the tab row lives at the bottom of the screen. */}
                  <h1 className={`text-lg sm:text-xl font-bold truncate ${themeConfig.header.text}`}>
                    <span className="md:hidden">{activeTabMeta.name}</span>
                    <span className="hidden md:inline">Event Admin</span>
                  </h1>
                  <p className={`text-xs sm:text-sm truncate ${themeConfig.text.muted}`}>
                    Welcome, {user.username}
                  </p>
                </div>
              </div>

              {/* Desktop: actions inline. Mobile: collapsed into a menu. */}
              <div className="hidden md:flex items-center gap-4">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 text-sm font-medium ${themeConfig.header.link}`}
                >
                  View Guest Portal
                </a>
                <button
                  onClick={handleLogout}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium ${themeConfig.header.link}`}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>

              <div className="relative md:hidden" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-lg',
                    themeConfig.header.link,
                    menuOpen && 'bg-stone-100'
                  )}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl animate-fadeIn"
                  >
                    <a
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${themeConfig.header.link}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Guest Portal
                    </a>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-3 border-t border-stone-200 px-4 py-3 text-left text-sm font-medium text-rose-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop tab row. Scrolls horizontally on narrow laptops rather
                than pushing the page wider than the viewport. */}
            <nav
              aria-label="Admin sections"
              className="hidden md:flex gap-2 lg:gap-6 overflow-x-auto no-scrollbar"
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    className={activeTab === tab.id ? themeConfig.tab.active : themeConfig.tab.inactive}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-nav">
          {activeTab === 'seating' && <SeatingChart />}
          {activeTab === 'roster' && <RosterView />}
          {activeTab === 'guests' && <GuestList />}
          {activeTab === 'settings' && <EventSettings />}
          {activeTab === 'users' && <UserManagement />}
        </main>

        {/* Mobile: thumb-reachable bottom navigation instead of a tab row that
            overflows the viewport. */}
        <nav
          aria-label="Admin sections"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur pb-safe md:hidden"
        >
          <div className="flex items-stretch">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 min-h-16 text-[11px] font-medium transition-colors',
                    isActive ? 'text-emerald-700' : 'text-stone-500'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-emerald-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {tab.short}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </DndProvider>
  );
}
