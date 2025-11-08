'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, MapPin, Edit3 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';

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
  shape: string;
  capacity: number;
}

interface EventSettings {
  eventName: string;
  homePageText: string;
}

export default function HomePage() {
  const themeConfig = useTheme();
  const [searchName, setSearchName] = useState('');
  const debouncedSearchName = useDebounce(searchName, 300);
  const [foundGuest, setFoundGuest] = useState<Guest | null>(null);
  const [guestTable, setGuestTable] = useState<Table | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Guest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [settings, setSettings] = useState<EventSettings>({
    eventName: "Mira & Kamal's Engagement",
    homePageText: 'Welcome to our engagement! Please find your table below.'
  });

  useEffect(() => {
    fetchSettings();
    fetchAllGuests();
    fetchAllTables();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
      }
    } catch {
      console.error('Failed to fetch settings');
    }
  };

  const fetchAllGuests = async () => {
    try {
      const response = await fetch('/api/guests');
      const data = await response.json();
      if (response.ok) {
        setAllGuests(data.guests);
      }
    } catch {
      console.error('Failed to fetch guests');
    }
  };

  const fetchAllTables = async () => {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      if (response.ok) {
        setAllTables(data.tables);
      }
    } catch {
      console.error('Failed to fetch tables');
    }
  };

  // Update suggestions based on debounced search term
  useEffect(() => {
    if (debouncedSearchName.trim().length > 0) {
      const filteredGuests = allGuests.filter(guest =>
        guest.name.toLowerCase().includes(debouncedSearchName.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions

      setSearchSuggestions(filteredGuests);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchName, allGuests]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchName(value);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSelectGuest(searchSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Get table name for a guest
  const getTableName = (tableId: string | null) => {
    if (!tableId) return 'Unassigned';
    const table = allTables.find(t => t.id === tableId);
    return table?.name || 'Unknown Table';
  };

  // Handle selecting a guest from suggestions
  const handleSelectGuest = (guest: Guest) => {
    setSearchName(guest.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSearchSuggestions([]);
    handleGuestSelection(guest);
  };

  // Handle guest selection (from dropdown or search)
  const handleGuestSelection = async (guest: Guest) => {
    setFoundGuest(guest);
    setAddress(guest.address || '');

    if (guest.tableId) {
      const table = allTables.find(t => t.id === guest.tableId);
      setGuestTable(table || null);
    } else {
      setGuestTable(null);
    }

    if (!guest.address) {
      setShowAddressForm(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setIsSearching(true);
    setShowSuggestions(false);

    // Find guest from already loaded data
    const guest = allGuests.find(g =>
      g.name.toLowerCase().includes(searchName.toLowerCase())
    );

    if (guest) {
      handleGuestSelection(guest);
    }

    setIsSearching(false);
  };

  const handleAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundGuest || !address.trim()) return;

    setIsUpdatingAddress(true);

    try {
      const response = await fetch('/api/guests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: foundGuest.id,
          address: address.trim(),
          requiresAuth: false,
        }),
      });

      if (response.ok) {
        setFoundGuest({ ...foundGuest, address: address.trim() });
        setShowAddressForm(false);
      }
    } catch {
      console.error('Failed to update address');
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/6T2A7308.jpg"
          alt="Background"
          fill
          className="object-cover object-top"
          priority
          quality={75}
        />
        {/* Beige semi-transparent overlay */}
        <div className="absolute inset-0 bg-stone-100/75" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-[4vh] sm:pt-[3vh] pb-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-5xl sm:text-6xl ${themeConfig.text.heading} mb-2 font-[family-name:var(--font-jimmy-script)]`}>{settings.eventName}</h1>
          <p className={`${themeConfig.text.body} text-lg`}>{settings.homePageText}</p>
        </div>

        {/* Search Form */}
        <div className={`${themeConfig.card} mb-8`}>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="search" className={`block ${themeConfig.text.label} mb-2`}>
                Enter Your Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchName}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (searchName.trim().length > 0 && searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for click
                    setTimeout(() => {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }, 200);
                  }}
                  placeholder="Type your full name..."
                  className={`px-4 py-3 pl-12 ${themeConfig.input}`}
                  required
                  autoComplete="off"
                />
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${themeConfig.icon.color.muted}`} />

                {/* Autocomplete Suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 bg-white ${themeConfig.classes.borderDefault} rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                    {searchSuggestions.map((guest, index) => (
                      <button
                        key={guest.id}
                        type="button"
                        onClick={() => handleSelectGuest(guest)}
                        className={`w-full px-4 py-3 text-left focus:outline-none border-b border-stone-100 last:border-b-0 transition-colors ${
                          index === selectedSuggestionIndex
                            ? `${themeConfig.theme.badge.unassigned.bg} ${themeConfig.theme.badge.unassigned.border}`
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={themeConfig.text.body}>{guest.name}</span>
                          <span className={getTableName(guest.tableId) === 'Unassigned'
                            ? themeConfig.badge.unassigned
                            : themeConfig.badge.assigned
                          }>
                            {getTableName(guest.tableId)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full text-white font-medium transition-all duration-200 py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: '#A38550' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 text-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-white" />
                  Find My Table
                </>
              )}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {foundGuest && (
          <div className={`${themeConfig.card} mb-6`}>
            <h2 className={`text-xl font-bold ${themeConfig.text.heading} mb-4 flex items-center gap-2`}>
              <MapPin className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
              Welcome, {foundGuest.name}!
            </h2>

            {guestTable ? (
              <div className={`${themeConfig.theme.gradient.floral} rounded-lg p-6 ${themeConfig.classes.borderBeige}`}>
                <h3 className={`font-semibold ${themeConfig.text.heading} text-lg mb-4 text-center`}>Your Table Assignment</h3>
                <div className="flex justify-center">
                  <div className={`bg-white rounded-lg px-8 py-4 border-2 ${themeConfig.classes.borderPrimary} shadow-md`}>
                    <span className={`text-3xl font-bold ${themeConfig.text.body}`}>{guestTable.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={themeConfig.badge.unassigned + ' rounded-lg p-4'}>
                <p>
                  Your table assignment is being finalized. Please check back later or contact the hosts.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Address Form */}
        {showAddressForm && foundGuest && (
          <div className={`${themeConfig.card} mb-6`}>
            <h3 className={`text-lg font-semibold ${themeConfig.text.heading} mb-4 flex items-center gap-2`}>
              <Edit3 className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
              Please Provide Your Address
            </h3>
            <form onSubmit={handleAddressUpdate} className="space-y-4">
              <div>
                <label htmlFor="address" className={`block ${themeConfig.text.label} mb-2`}>
                  Mailing Address
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your complete mailing address..."
                  className={`w-full px-3 py-2 rounded-lg h-20 ${themeConfig.input}`}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex-1 text-white font-medium transition-all duration-200 py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#A38550' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
                >
                  {isUpdatingAddress ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-white font-medium transition-all duration-200 py-2 px-4 rounded-lg"
                  style={{ backgroundColor: '#A38550' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
