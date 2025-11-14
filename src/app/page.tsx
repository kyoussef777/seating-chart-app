'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, MapPin, Edit3, Users } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  address: string | null;
  tableId: string | null;
  partySize: number;
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
  searchEnabled: boolean;
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
  const [justSelected, setJustSelected] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<EventSettings>({
    eventName: "Mira & Kamal's Engagement",
    homePageText: 'Welcome to our engagement! Please find your table below.',
    searchEnabled: true
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
    } finally {
      setSettingsLoading(false);
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

  // Smart search algorithm with fuzzy matching
  const smartSearch = (searchTerm: string, guests: Guest[]): Guest[] => {
    if (!searchTerm) return [];

    const term = searchTerm.toLowerCase().trim();
    const words = term.split(/\s+/);

    // Score each guest based on match quality
    const scored = guests.map(guest => {
      const name = guest.name.toLowerCase();
      let score = 0;

      // Exact match (highest priority)
      if (name === term) {
        score = 1000;
      }
      // Starts with search term
      else if (name.startsWith(term)) {
        score = 500;
      }
      // Contains exact search term
      else if (name.includes(term)) {
        score = 250;
      }
      // Multi-word matching (for "john smith" matching "smith john")
      else if (words.length > 1) {
        const nameWords = name.split(/\s+/);
        const matchedWords = words.filter(word =>
          nameWords.some(nameWord => nameWord.startsWith(word) || nameWord.includes(word))
        );
        score = matchedWords.length * 100;
      }
      // Partial word matching
      else {
        const nameWords = name.split(/\s+/);
        const hasPartialMatch = nameWords.some(word => word.includes(term) || term.includes(word));
        if (hasPartialMatch) score = 50;
      }

      // Bonus for first name match
      const firstName = name.split(/\s+/)[0];
      if (firstName.startsWith(term)) {
        score += 50;
      }

      return { guest, score };
    });

    // Filter out non-matches and sort by score
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Show top 10 results
      .map(item => item.guest);
  };

  // Update suggestions based on debounced search term
  useEffect(() => {
    if (justSelected) {
      // Don't show suggestions right after selecting a guest
      return;
    }

    if (debouncedSearchName.trim().length > 0) {
      const filteredGuests = smartSearch(debouncedSearchName, allGuests);
      setSearchSuggestions(filteredGuests);
      setShowSuggestions(filteredGuests.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchName, allGuests, justSelected]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchName(value);
    setSelectedSuggestionIndex(-1);
    setJustSelected(false); // Reset flag when user types
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

  // Handle selecting a guest from suggestions
  const handleSelectGuest = (guest: Guest) => {
    setSearchName(guest.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSearchSuggestions([]);
    setJustSelected(true); // Mark that we just selected a guest
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
    if (!searchName.trim() || !settings.searchEnabled) return;

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
          className="object-cover object-top sm:object-[center_30%]"
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
          <h1 className={`text-5xl sm:text-5xl ${themeConfig.text.heading} mb-4 font-[family-name:var(--font-fleur-de-leah)] tracking-wide leading-tight`}>{settings.eventName}</h1>
          <p className={`${themeConfig.text.body} text-lg sm:text-xl font-[family-name:var(--font-playfair-display)] tracking-wide leading-relaxed`}>{settings.homePageText}</p>
        </div>

        {/* Search Form or Disabled Message */}
        {settingsLoading ? (
          <div className={`${themeConfig.card} mb-8 text-center py-12`}>
            <div className={`w-8 h-8 border-4 ${themeConfig.loading.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
            <p className={themeConfig.loading.text}>Loading...</p>
          </div>
        ) : settings.searchEnabled ? (
          <div className={`${themeConfig.card} mb-8`}>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="search" className={`block ${themeConfig.text.label} mb-2 font-[family-name:var(--font-playfair-display)] tracking-wide`}>
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
                    }, 300);
                  }}
                  placeholder="Type your full name..."
                  className={`px-4 py-3 pl-12 ${themeConfig.input} font-[family-name:var(--font-playfair-display)]`}
                  required
                  autoComplete="off"
                />
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${themeConfig.icon.color.muted}`} />

                {/* Autocomplete Suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 bg-white ${themeConfig.classes.borderDefault} rounded-lg shadow-xl max-h-80 overflow-y-auto animate-fadeIn`}>
                    {searchSuggestions.map((guest, index) => (
                      <button
                        key={guest.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectGuest(guest);
                        }}
                        className={`w-full px-4 py-3 text-left focus:outline-none border-b border-stone-100 last:border-b-0 transition-all duration-150 font-[family-name:var(--font-playfair-display)] group ${
                          index === selectedSuggestionIndex
                            ? 'bg-amber-50 border-l-4 border-l-amber-500'
                            : 'hover:bg-stone-50 hover:border-l-4 hover:border-l-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`${themeConfig.text.body} transition-colors ${
                            index === selectedSuggestionIndex ? 'font-medium' : ''
                          }`}>
                            {guest.name}
                          </span>
                          {guest.partySize && guest.partySize > 1 && (
                            <span className="text-xs text-stone-500 ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                              Party of {guest.partySize}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {searchSuggestions.length >= 10 && (
                      <div className="px-4 py-2 text-xs text-stone-500 text-center bg-stone-50 border-t border-stone-200">
                        Showing top 10 results - keep typing for more specific matches
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full text-white font-medium transition-all duration-200 py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-[family-name:var(--font-playfair-display)] tracking-wide text-lg"
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
        ) : (
          <div className={`${themeConfig.card} mb-8 text-center py-12`}>
            <div className={`mx-auto w-16 h-16 rounded-full ${themeConfig.theme.gradient.icon} flex items-center justify-center mb-4`}>
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className={`text-xl font-semibold ${themeConfig.text.heading} mb-2 font-[family-name:var(--font-playfair-display)]`}>
              Table Search Not Available Yet
            </h3>
            <p className={`${themeConfig.text.body} font-[family-name:var(--font-playfair-display)]`}>
              The table search will be enabled on the day of the event. Please check back later!
            </p>
          </div>
        )}

        {/* Search Results */}
        {foundGuest && (
          <div className={`${themeConfig.card} mb-6`}>
            <h2 className={`text-xl sm:text-2xl font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} mb-4 flex items-center gap-2 tracking-wide`}>
              <MapPin className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
              Welcome, {foundGuest.name}!
            </h2>

            {/* Party Size Info */}
            <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
                <span className={`${themeConfig.text.body} font-medium font-[family-name:var(--font-playfair-display)] tracking-wide`}>
                  Party Size: {foundGuest.partySize || 1} {(foundGuest.partySize || 1) === 1 ? 'person' : 'people'}
                </span>
              </div>
              <p className={`${themeConfig.text.muted} text-sm mt-1 ml-7 font-[family-name:var(--font-playfair-display)]`}>
                {(foundGuest.partySize || 1) > 1
                  ? `Your reservation includes ${foundGuest.partySize} seats (including children and family members).`
                  : 'Your reservation is for 1 person.'}
              </p>
            </div>

            {guestTable ? (
              <div className={`${themeConfig.theme.gradient.floral} rounded-lg p-6 ${themeConfig.classes.borderBeige}`}>
                <h3 className={`font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} text-lg mb-4 text-center tracking-wide`}>Your Table Assignment</h3>
                <div className="flex justify-center">
                  <div className={`bg-white rounded-lg px-8 py-4 border-2 ${themeConfig.classes.borderPrimary} shadow-md`}>
                    <span className={`text-3xl sm:text-4xl font-bold ${themeConfig.text.body} font-[family-name:var(--font-playfair-display)] tracking-wider`}>{guestTable.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={themeConfig.badge.unassigned + ' rounded-lg p-4 font-[family-name:var(--font-playfair-display)]'}>
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
            <h3 className={`text-lg font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} mb-4 flex items-center gap-2 tracking-wide`}>
              <Edit3 className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
              Please Provide Your Address
            </h3>
            <form onSubmit={handleAddressUpdate} className="space-y-4">
              <div>
                <label htmlFor="address" className={`block ${themeConfig.text.label} mb-2 font-[family-name:var(--font-playfair-display)] tracking-wide`}>
                  Mailing Address
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your complete mailing address..."
                  className={`w-full px-3 py-2 rounded-lg h-20 ${themeConfig.input} font-[family-name:var(--font-playfair-display)]`}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex-1 text-white font-medium transition-all duration-200 py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-playfair-display)] tracking-wide"
                  style={{ backgroundColor: '#A38550' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
                >
                  {isUpdatingAddress ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="text-white font-medium transition-all duration-200 py-2 px-4 rounded-lg font-[family-name:var(--font-playfair-display)] tracking-wide"
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
