'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchGuests, MAX_SUGGESTIONS } from '@/lib/guest-search';
import { defaultPortalSettings, toPortalSettings, type PortalSettings } from '@/lib/event-settings';

export interface PortalGuest {
  id: string;
  name: string;
  address: string | null;
  tableId: string | null;
  partySize: number;
}

export interface PortalTable {
  id: string;
  name: string;
  shape: string;
  capacity: number;
}

/**
 * All guest-portal behaviour in one place: settings, guest/table data, the
 * autocomplete, the table lookup and the optional address capture.
 *
 * Templates render this state; none of them owns any of it, which is what lets
 * a new look be a presentation-only component.
 */
export function useGuestPortal(initialSettings?: PortalSettings | null) {
  const [settings, setSettings] = useState<PortalSettings>(
    initialSettings ?? defaultPortalSettings()
  );
  // Settings rendered on the server need no second fetch, so the portal opens
  // with its final copy instead of easing it in.
  const [settingsLoading, setSettingsLoading] = useState(!initialSettings);

  const [guests, setGuests] = useState<PortalGuest[]>([]);
  const [tables, setTables] = useState<PortalTable[]>([]);

  const [searchName, setSearchName] = useState('');
  const debouncedSearchName = useDebounce(searchName, 300);
  const [suggestions, setSuggestions] = useState<PortalGuest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [foundGuest, setFoundGuest] = useState<PortalGuest | null>(null);
  const [guestTable, setGuestTable] = useState<PortalTable | null>(null);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [address, setAddress] = useState('');
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Server-rendered settings are read once; later renders must not re-trigger
  // the initial load.
  const hadInitialSettings = useRef(Boolean(initialSettings));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hadInitialSettings.current) {
        try {
          const response = await fetch('/api/settings');
          const data = await response.json();
          if (!cancelled && response.ok) setSettings(toPortalSettings(data.settings));
        } catch {
          // Keep the defaults already on screen.
        } finally {
          if (!cancelled) setSettingsLoading(false);
        }
      }

      try {
        const [guestRes, tableRes] = await Promise.all([
          fetch('/api/guests'),
          fetch('/api/tables'),
        ]);
        const [guestData, tableData] = await Promise.all([guestRes.json(), tableRes.json()]);
        if (cancelled) return;
        if (guestRes.ok) setGuests(guestData.guests ?? []);
        if (tableRes.ok) setTables(tableData.tables ?? []);
      } catch {
        if (!cancelled) setSearchError('We could not load the guest list. Please refresh.');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );

  useEffect(() => {
    if (justSelected) return;

    if (debouncedSearchName.trim().length > 0) {
      const matches = searchGuests(debouncedSearchName, guests);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchName, guests, justSelected]);

  const selectGuest = useCallback(
    (guest: PortalGuest) => {
      setSearchName(guest.name);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setSuggestions([]);
      setJustSelected(true);
      setSearchError(null);

      setFoundGuest(guest);
      setAddress(guest.address || '');
      setGuestTable(guest.tableId ? tables.find((t) => t.id === guest.tableId) ?? null : null);
      setAddressError(null);
      // Only ask for an address when the admin has address collection on.
      setShowAddressForm(!guest.address && settings.addressCollectionEnabled);
    },
    [tables, settings.addressCollectionEnabled]
  );

  const onSearchChange = useCallback((value: string) => {
    setSearchName(value);
    setHighlightedIndex(-1);
    setJustSelected(false);
    setSearchError(null);
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case 'Enter':
          if (highlightedIndex >= 0) {
            event.preventDefault();
            selectGuest(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, highlightedIndex, selectGuest]
  );

  const onFocus = useCallback(() => {
    if (searchName.trim().length > 0 && suggestions.length > 0) setShowSuggestions(true);
  }, [searchName, suggestions.length]);

  const onBlur = useCallback(() => {
    // Long enough for a tap on a suggestion to land first.
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 300);
  }, []);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!searchName.trim() || !settings.searchEnabled) return;

      setIsSearching(true);
      setShowSuggestions(false);

      const [best] = searchGuests(searchName, guests);
      if (best) {
        selectGuest(best);
      } else {
        setFoundGuest(null);
        setGuestTable(null);
        setSearchError(
          'We could not find that name. Try the name on your invitation, or ask a host.'
        );
      }

      setIsSearching(false);
    },
    [searchName, settings.searchEnabled, guests, selectGuest]
  );

  const onAddressSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!foundGuest || !address.trim()) return;

      setIsUpdatingAddress(true);
      setAddressError(null);

      try {
        const response = await fetch('/api/guests', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: foundGuest.id, address: address.trim() }),
        });

        if (response.ok) {
          setFoundGuest({ ...foundGuest, address: address.trim() });
          setShowAddressForm(false);
        } else {
          const data = await response.json().catch(() => ({}));
          setAddressError(data.error || 'We could not save that address. Please try again.');
        }
      } catch {
        setAddressError('We could not save that address. Please try again.');
      } finally {
        setIsUpdatingAddress(false);
      }
    },
    [foundGuest, address]
  );

  const skipAddress = useCallback(() => setShowAddressForm(false), []);

  const partySize = foundGuest?.partySize || 1;

  const suggestionsCapped = suggestions.length >= MAX_SUGGESTIONS;

  return useMemo(
    () => ({
      settings,
      settingsLoading,
      searchName,
      suggestions,
      suggestionsCapped,
      showSuggestions,
      highlightedIndex,
      isSearching,
      searchError,
      foundGuest,
      guestTable,
      partySize,
      showAddressForm,
      address,
      isUpdatingAddress,
      addressError,
      onSearchChange,
      onKeyDown,
      onFocus,
      onBlur,
      onSubmit,
      selectGuest,
      setAddress,
      onAddressSubmit,
      skipAddress,
    }),
    [
      settings,
      settingsLoading,
      searchName,
      suggestions,
      suggestionsCapped,
      showSuggestions,
      highlightedIndex,
      isSearching,
      searchError,
      foundGuest,
      guestTable,
      partySize,
      showAddressForm,
      address,
      isUpdatingAddress,
      addressError,
      onSearchChange,
      onKeyDown,
      onFocus,
      onBlur,
      onSubmit,
      selectGuest,
      onAddressSubmit,
      skipAddress,
    ]
  );
}

export type GuestPortal = ReturnType<typeof useGuestPortal>;
