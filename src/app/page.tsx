'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, MapPin, Edit3, Users, X, ChevronDown } from 'lucide-react';
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
  const [notFound, setNotFound] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [address, setAddress] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Guest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<EventSettings>({
    eventName: 'Our Special Day',
    homePageText: 'Welcome! Please find your table assignment below.',
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

    const scored = guests.map(guest => {
      const name = guest.name.toLowerCase();
      let score = 0;

      if (name === term) {
        score = 1000;
      } else if (name.startsWith(term)) {
        score = 500;
      } else if (name.includes(term)) {
        score = 250;
      } else if (words.length > 1) {
        const nameWords = name.split(/\s+/);
        const matchedWords = words.filter(word =>
          nameWords.some(nameWord => nameWord.startsWith(word) || nameWord.includes(word))
        );
        score = matchedWords.length * 100;
      } else {
        const nameWords = name.split(/\s+/);
        const hasPartialMatch = nameWords.some(word => word.includes(term) || term.includes(word));
        if (hasPartialMatch) score = 50;
      }

      const firstName = name.split(/\s+/)[0];
      if (firstName.startsWith(term)) {
        score += 50;
      }

      return { guest, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.guest);
  };

  useEffect(() => {
    if (justSelected) return;

    if (debouncedSearchName.trim().length > 0) {
      const filteredGuests = smartSearch(debouncedSearchName, allGuests);
      setSearchSuggestions(filteredGuests);
      setShowSuggestions(filteredGuests.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchName, allGuests, justSelected]);

  const handleSearchChange = (value: string) => {
    setSearchName(value);
    setSelectedSuggestionIndex(-1);
    setJustSelected(false);
    setNotFound(false);
    if (!value.trim()) {
      setFoundGuest(null);
      setGuestTable(null);
      setShowAddressForm(false);
      setAddressSaved(false);
    }
  };

  const handleClearSearch = () => {
    setSearchName('');
    setFoundGuest(null);
    setGuestTable(null);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setJustSelected(false);
    setNotFound(false);
    setShowAddressForm(false);
    setAddressSaved(false);
  };

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

  const handleSelectGuest = (guest: Guest) => {
    setSearchName(guest.name);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSearchSuggestions([]);
    setJustSelected(true);
    setNotFound(false);
    handleGuestSelection(guest);
  };

  const handleGuestSelection = (guest: Guest) => {
    setFoundGuest(guest);
    setAddress(guest.address || '');
    setAddressSaved(false);

    if (guest.tableId) {
      const table = allTables.find(t => t.id === guest.tableId);
      setGuestTable(table || null);
    } else {
      setGuestTable(null);
    }

    if (!guest.address) {
      setShowAddressForm(true);
    } else {
      setShowAddressForm(false);
    }

    // Scroll to results
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim() || !settings.searchEnabled) return;

    setIsSearching(true);
    setShowSuggestions(false);
    setNotFound(false);

    const guest = allGuests.find(g =>
      g.name.toLowerCase().includes(searchName.toLowerCase())
    );

    if (guest) {
      handleGuestSelection(guest);
    } else {
      setFoundGuest(null);
      setGuestTable(null);
      setNotFound(true);
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
        setAddressSaved(true);
      }
    } catch {
      console.error('Failed to update address');
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background with elegant gradient fallback */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/6T2A7308.jpg"
          alt="Background"
          fill
          className="object-cover object-top sm:object-[center_30%]"
          priority
          quality={75}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-100/80 via-stone-100/70 to-stone-200/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-[5vh] sm:pt-[4vh] pb-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10 animate-fadeIn">
          <div className="mb-3">
            <span className="inline-block text-stone-400 text-sm font-[family-name:var(--font-playfair-display)] tracking-[0.3em] uppercase">
              Find Your Seat
            </span>
          </div>
          <h1 className={`text-5xl sm:text-6xl ${themeConfig.text.heading} mb-4 font-[family-name:var(--font-fleur-de-leah)] tracking-wide leading-tight`}>
            {settings.eventName}
          </h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-16 bg-stone-400/50" />
            <span className="text-stone-400 text-lg">&#10047;</span>
            <div className="h-px w-16 bg-stone-400/50" />
          </div>
          <p className={`${themeConfig.text.body} text-lg sm:text-xl font-[family-name:var(--font-playfair-display)] tracking-wide leading-relaxed max-w-lg mx-auto`}>
            {settings.homePageText}
          </p>
        </div>

        {/* Search Form or Disabled Message */}
        {settingsLoading ? (
          <div className={`${themeConfig.card} mb-8 text-center py-12`}>
            <div className={`w-8 h-8 border-4 ${themeConfig.loading.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
            <p className={themeConfig.loading.text}>Loading...</p>
          </div>
        ) : settings.searchEnabled ? (
          <div className={`${themeConfig.card} mb-8 animate-fadeIn`} style={{ animationDelay: '0.1s' }}>
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
                      setTimeout(() => {
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }, 300);
                    }}
                    placeholder="Type your full name..."
                    className={`px-4 py-3.5 pl-12 pr-10 ${themeConfig.input} font-[family-name:var(--font-playfair-display)] text-base`}
                    required
                    autoComplete="off"
                  />
                  <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${themeConfig.icon.color.muted}`} />

                  {/* Clear button */}
                  {searchName && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Autocomplete Suggestions */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className={`absolute z-10 w-full mt-1 bg-white border ${themeConfig.classes.borderDefault} rounded-xl shadow-xl max-h-80 overflow-y-auto animate-fadeIn`}>
                      <div className="px-4 py-2 text-xs text-stone-400 font-[family-name:var(--font-playfair-display)] border-b border-stone-100 flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />
                        Select your name below
                      </div>
                      {searchSuggestions.map((guest, index) => (
                        <button
                          key={guest.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectGuest(guest);
                          }}
                          className={`w-full px-4 py-3 text-left focus:outline-none border-b border-stone-50 last:border-b-0 transition-all duration-150 font-[family-name:var(--font-playfair-display)] group ${
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
                            <div className="flex items-center gap-2">
                              {guest.partySize && guest.partySize > 1 && (
                                <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                                  Party of {guest.partySize}
                                </span>
                              )}
                              {guest.tableId && (
                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Assigned
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      {searchSuggestions.length >= 10 && (
                        <div className="px-4 py-2 text-xs text-stone-400 text-center bg-stone-50 border-t border-stone-100">
                          Showing top 10 results &mdash; keep typing for more specific matches
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full text-white font-medium transition-all duration-200 py-3.5 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-[family-name:var(--font-playfair-display)] tracking-wide text-lg shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#A38550' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div className={`${themeConfig.card} mb-8 text-center py-12 animate-fadeIn`}>
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

        {/* Not Found Message */}
        {notFound && !foundGuest && (
          <div className="mb-6 animate-fadeIn" ref={resultRef}>
            <div className={`${themeConfig.card} text-center py-8`}>
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className={`text-lg font-semibold ${themeConfig.text.heading} mb-2 font-[family-name:var(--font-playfair-display)]`}>
                Name Not Found
              </h3>
              <p className={`${themeConfig.text.muted} font-[family-name:var(--font-playfair-display)] max-w-sm mx-auto`}>
                We couldn&apos;t find &ldquo;{searchName}&rdquo; on the guest list. Please check the spelling or try a different name.
              </p>
              <button
                onClick={handleClearSearch}
                className="mt-4 text-sm font-medium transition-colors font-[family-name:var(--font-playfair-display)] px-4 py-2 rounded-lg"
                style={{ color: '#A38550' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {foundGuest && (
          <div ref={resultRef} className="space-y-4 animate-fadeIn">
            {/* Welcome Card */}
            <div className={`${themeConfig.card}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl sm:text-2xl font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} flex items-center gap-2 tracking-wide`}>
                  <MapPin className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
                  Welcome, {foundGuest.name}!
                </h2>
                <button
                  onClick={handleClearSearch}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 rounded-lg hover:bg-stone-100"
                  title="Search again"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Party Size Info */}
              {(foundGuest.partySize || 1) > 1 && (
                <div className="mb-5 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2">
                    <Users className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
                    <span className={`${themeConfig.text.body} font-medium font-[family-name:var(--font-playfair-display)] tracking-wide`}>
                      Party of {foundGuest.partySize}
                    </span>
                  </div>
                  <p className={`${themeConfig.text.muted} text-sm mt-1 ml-7 font-[family-name:var(--font-playfair-display)]`}>
                    Your reservation includes {foundGuest.partySize} seats.
                  </p>
                </div>
              )}

              {/* Table Assignment */}
              {guestTable ? (
                <div className="rounded-xl p-6 bg-gradient-to-br from-emerald-50 via-white to-stone-50 border border-emerald-200">
                  <h3 className={`font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} text-base mb-4 text-center tracking-wide`}>
                    Your Table Assignment
                  </h3>
                  <div className="flex justify-center">
                    <div className="bg-white rounded-xl px-10 py-5 border-2 border-emerald-500 shadow-lg relative">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-3 py-0.5 rounded-full font-[family-name:var(--font-playfair-display)]">
                        TABLE
                      </div>
                      <span className={`text-3xl sm:text-4xl font-bold ${themeConfig.text.body} font-[family-name:var(--font-playfair-display)] tracking-wider`}>
                        {guestTable.name}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-5 bg-amber-50 border border-amber-200 font-[family-name:var(--font-playfair-display)] text-amber-800 text-center">
                  <p className="font-medium mb-1">Table assignment pending</p>
                  <p className="text-sm text-amber-600">
                    Your table will be assigned soon. Please check back later or contact the hosts.
                  </p>
                </div>
              )}
            </div>

            {/* Address Saved Confirmation */}
            {addressSaved && (
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-[family-name:var(--font-playfair-display)] animate-fadeIn">
                <p className="font-medium">Thank you! Your address has been saved.</p>
              </div>
            )}
          </div>
        )}

        {/* Address Form */}
        {showAddressForm && foundGuest && (
          <div className={`${themeConfig.card} mt-4 animate-fadeIn`}>
            <h3 className={`text-lg font-[family-name:var(--font-playfair-display)] ${themeConfig.text.heading} mb-4 flex items-center gap-2 tracking-wide`}>
              <Edit3 className={`w-5 h-5 ${themeConfig.icon.color.primary}`} />
              Please Provide Your Mailing Address
            </h3>
            <p className={`text-sm ${themeConfig.text.muted} mb-4 font-[family-name:var(--font-playfair-display)]`}>
              This helps us send you thank-you cards and other correspondence.
            </p>
            <form onSubmit={handleAddressUpdate} className="space-y-4">
              <div>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your complete mailing address..."
                  className={`w-full px-4 py-3 rounded-xl h-24 ${themeConfig.input} font-[family-name:var(--font-playfair-display)] resize-none`}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex-1 text-white font-medium transition-all duration-200 py-2.5 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-playfair-display)] tracking-wide shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#A38550' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B7043'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#A38550'}
                >
                  {isUpdatingAddress ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Address'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-6 py-2.5 font-medium transition-all duration-200 rounded-xl font-[family-name:var(--font-playfair-display)] tracking-wide border border-stone-300 text-stone-600 hover:bg-stone-50"
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
