'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  addressCollectionEnabled: boolean;
}

// Venue/date line from the design. Not stored in eventSettings — edit here.
const VENUE = "Angalina's Staten Island";
const EVENT_DATE = 'September 26';

const GOLD = '#C9B896';
const GOLD_TEXT = '#8A7A5C';
const GREEN = '#4A5F45';

type Bfly = {
  id: string;
  left: string;
  top: string;
  w: number;
  h: number;
  fly: string;
  dur: number;
  delay: number;
  mid: string;
  deep: string;
};

/** Butterflies, transcribed from the design (position, flight path, palette). */
const BUTTERFLIES: Bfly[] = [
  { id: 'gb1', left: '4%', top: '30%', w: 82, h: 66, fly: 'flyb1', dur: 34, delay: 0, mid: '#F2C4B4', deep: '#A66450' },
  { id: 'gb2', left: '86%', top: '22%', w: 62, h: 50, fly: 'flyb2', dur: 39, delay: 2.5, mid: '#DCC8E6', deep: '#7A5C8C' },
  { id: 'gb3', left: '2%', top: '60%', w: 56, h: 45, fly: 'flyb3', dur: 31, delay: 5, mid: '#F6DFA8', deep: '#9A7530' },
];

const BUTTERFLIES_FRONT: Bfly[] = [
  { id: 'gb4', left: '76%', top: '60%', w: 52, h: 42, fly: 'flyb4', dur: 28, delay: 1.2, mid: '#F2C4B4', deep: '#A66450' },
  { id: 'gb5', left: '10%', top: '78%', w: 44, h: 35, fly: 'flyb5', dur: 33, delay: 3.4, mid: '#CBDCBB', deep: '#5F7A50' },
  { id: 'gb6', left: '50%', top: '90%', w: 38, h: 30, fly: 'flyb6', dur: 26, delay: 6, mid: '#F6DFA8', deep: '#9A7530' },
  { id: 'gb7', left: '30%', top: '92%', w: 34, h: 27, fly: 'flyb7', dur: 30, delay: 2, mid: '#DCC8E6', deep: '#7A5C8C' },
  { id: 'gb8', left: '90%', top: '84%', w: 40, h: 32, fly: 'flyb8', dur: 36, delay: 4.6, mid: '#EFCBD6', deep: '#9E5F73' },
];

const WING_L = 'M0 0 C -4 -20, -26 -34, -40 -25 C -52 -17, -46 3, -26 9 C -14 12, -4 8, 0 0 Z';
const WING_L2 = 'M0 3 C -8 13, -24 24, -34 15 C -42 8, -32 -3, -18 1 C -10 3, -4 3, 0 3 Z';

function Butterfly({ b }: { b: Bfly }) {
  // Source design encodes the flap into the flight cycle; 3.2% of it per beat.
  const wing = `wingflap ${(b.dur * 0.032).toFixed(3)}s linear infinite ${b.delay}s`;
  const wings = (
    <>
      <path d={WING_L} fill={`url(#${b.id})`} stroke={b.deep} strokeWidth="1.3" />
      <path d={WING_L2} fill={`url(#${b.id})`} stroke={b.deep} strokeWidth="1.1" opacity=".96" />
    </>
  );

  return (
    <div
      className="garden-motion absolute"
      style={{
        left: b.left,
        top: b.top,
        animation: `${b.fly} ${b.dur}s cubic-bezier(.42,.02,.58,1) infinite ${b.delay}s`,
        filter: 'drop-shadow(0 6px 10px rgba(70,62,48,.3))',
      }}
    >
      <svg width={b.w} height={b.h} viewBox="-56 -40 112 64" style={{ overflow: 'visible' }} aria-hidden>
        <defs>
          <linearGradient id={b.id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF8F4" stopOpacity=".97" />
            <stop offset="55%" stopColor={b.mid} stopOpacity=".94" />
            <stop offset="100%" stopColor={b.deep} stopOpacity=".9" />
          </linearGradient>
        </defs>
        <g className="garden-motion" style={{ transformOrigin: '0px 0px', animation: wing }}>{wings}</g>
        <g className="garden-motion" transform="scale(-1,1)" style={{ transformOrigin: '0px 0px', animation: wing }}>
          {wings}
        </g>
        <path d="M0 -13 C 2.6 -8, 2.8 6, 0 13 C -2.8 6, -2.6 -8, 0 -13 Z" fill={b.deep} opacity=".9" />
        <path d="M0 -12 C -3 -20, -8 -24, -12 -25" fill="none" stroke={b.deep} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
        <path d="M0 -12 C 3 -20, 8 -24, 12 -25" fill="none" stroke={b.deep} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
      </svg>
    </div>
  );
}

const rule = (dir: 'l' | 'r' | 'flat', w: number) => ({
  width: w,
  height: 1,
  background:
    dir === 'flat' ? GOLD : `linear-gradient(${dir === 'l' ? '90deg' : '270deg'},transparent,${GOLD})`,
});

export default function HomePage() {
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
  // Defaults match the live event so the header never flashes stale copy
  // before /api/settings resolves.
  const [settings, setSettings] = useState<EventSettings>({
    eventName: "Mira's Bridal Shower",
    homePageText: 'Welcome to the garden! Find your table',
    searchEnabled: true,
    addressCollectionEnabled: true,
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

    const scored = guests.map((guest) => {
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
        const matchedWords = words.filter((word) =>
          nameWords.some((nameWord) => nameWord.startsWith(word) || nameWord.includes(word))
        );
        score = matchedWords.length * 100;
      } else {
        const nameWords = name.split(/\s+/);
        const hasPartialMatch = nameWords.some((word) => word.includes(term) || term.includes(word));
        if (hasPartialMatch) score = 50;
      }

      const firstName = name.split(/\s+/)[0];
      if (firstName.startsWith(term)) {
        score += 50;
      }

      return { guest, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.guest);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
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
    handleGuestSelection(guest);
  };

  const handleGuestSelection = async (guest: Guest) => {
    setFoundGuest(guest);
    setAddress(guest.address || '');

    if (guest.tableId) {
      const table = allTables.find((t) => t.id === guest.tableId);
      setGuestTable(table || null);
    } else {
      setGuestTable(null);
    }

    // Only ask for an address when the admin has address collection switched on.
    if (!guest.address && settings.addressCollectionEnabled) {
      setShowAddressForm(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim() || !settings.searchEnabled) return;

    setIsSearching(true);
    setShowSuggestions(false);

    const guest = allGuests.find((g) => g.name.toLowerCase().includes(searchName.toLowerCase()));

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
        headers: { 'Content-Type': 'application/json' },
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

  const partySize = foundGuest?.partySize || 1;

  // Last word of the event name drops to an indented second line.
  const titleWords = settings.eventName.trim().split(/\s+/);
  const titleTail = titleWords.length > 1 ? titleWords[titleWords.length - 1] : '';
  const titleHead = titleTail ? titleWords.slice(0, -1).join(' ') : settings.eventName;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 42%,#FBF6EE 66%,#F3EEE0 82%,#E9F0E0 100%)',
      }}
    >
      {/* Soft colour pools */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(34% 26% at 8% 62%,rgba(246,220,214,.4),transparent 72%),radial-gradient(32% 24% at 92% 70%,rgba(224,233,210,.55),transparent 72%),radial-gradient(46% 30% at 60% 100%,rgba(233,240,224,.8),transparent 72%)',
        }}
      />

      {/* Hanging canopy */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[230px] overflow-hidden sm:h-[340px]">
        <Image
          src="/canopy.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{
            objectPosition: 'center 12%',
            filter: 'saturate(.92) brightness(1.03) contrast(.97) blur(0.6px)',
            opacity: 0.97,
            WebkitMaskImage:
              'linear-gradient(180deg,#000 58%,rgba(0,0,0,.55) 82%,transparent 100%)',
            maskImage: 'linear-gradient(180deg,#000 58%,rgba(0,0,0,.55) 82%,transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.12) 60%,rgba(255,255,255,.55))',
            mixBlendMode: 'screen',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(60% 80% at 50% 0%,rgba(255,252,246,.5),transparent 70%)' }}
        />
      </div>

      {/* Meadow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[215px] overflow-hidden sm:h-[240px]"
        style={{
          filter: 'blur(1.1px) saturate(.8) brightness(1.05)',
          opacity: 0.88,
          WebkitMaskImage:
            'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.45) 22%,#000 62%),linear-gradient(90deg,rgba(0,0,0,.3) 0%,#000 16%,#000 84%,rgba(0,0,0,.3) 100%)',
          WebkitMaskComposite: 'source-in',
          maskImage:
            'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.45) 22%,#000 62%),linear-gradient(90deg,rgba(0,0,0,.3) 0%,#000 16%,#000 84%,rgba(0,0,0,.3) 100%)',
          maskComposite: 'intersect',
        }}
      >
        <Image
          src="/meadow.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center bottom' }}
        />
      </div>

      {/* Fireflies */}
      {[
        { left: '10%', top: '40%', s: 7, d: 4.5, delay: 0 },
        { left: '22%', top: '62%', s: 5, d: 5.5, delay: 1.4 },
        { left: '46%', top: '34%', s: 6, d: 6, delay: 2.2 },
        { left: '74%', top: '48%', s: 7, d: 5, delay: 0.8 },
        { left: '88%', top: '66%', s: 5, d: 6.5, delay: 3 },
        { left: '62%', top: '78%', s: 6, d: 4.8, delay: 1.9 },
      ].map((f, i) => (
        <div
          key={i}
          className="garden-motion pointer-events-none absolute rounded-full"
          style={{
            left: f.left,
            top: f.top,
            width: f.s,
            height: f.s,
            background: '#F7E7B2',
            boxShadow: `0 0 ${f.s * 2}px ${f.s * 0.7}px rgba(247,231,178,.75)`,
            animation: `twinkle ${f.d}s ease-in-out infinite ${f.delay}s`,
          }}
        />
      ))}

      {/* Butterflies behind the card */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {BUTTERFLIES.map((b) => (
          <Butterfly key={b.id} b={b} />
        ))}
      </div>

      {/* ---- Card ---- */}
      <div className="relative mx-auto w-full max-w-[560px] px-[18px] pt-[62px] pb-10 sm:px-0 sm:pt-24">
        {/* Arch outlines */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: '38px -18px 24px',
            border: `1.5px solid rgba(201,184,150,.75)`,
            borderRadius: '290px 290px 26px 26px',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            inset: '46px -10px 32px',
            border: `1px solid rgba(201,184,150,.4)`,
            borderRadius: '280px 280px 20px 20px',
          }}
        />

        <div
          className="garden-enter relative px-6 pt-9 pb-7 sm:px-[46px] sm:pt-11 sm:pb-[38px]"
          style={{
            background: 'linear-gradient(180deg,rgba(255,253,248,.94),rgba(255,251,244,.88))',
            borderRadius: '270px 270px 22px 22px',
            boxShadow: '0 30px 70px -34px rgba(74,95,69,.6)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="text-center"
            style={{
              // Copy is always legible; it just settles to full strength once
              // /api/settings lands, so a changed name eases in instead of snapping.
              opacity: settingsLoading ? 0.62 : 1,
              transition: 'opacity 700ms cubic-bezier(0.2,0.7,0.3,1)',
            }}
          >
            <div className="mb-4 flex items-center justify-center gap-3 sm:mb-5">
              <span style={rule('flat', 40)} />
              <span
                className="font-[family-name:var(--font-cormorant)] text-[12px] uppercase sm:text-[13px]"
                style={{ letterSpacing: '.44em', color: GOLD_TEXT }}
              >
                Bridal Shower
              </span>
              <span style={rule('flat', 40)} />
            </div>

            {/* Shrink-wrapped to the first line, then centred as a unit, so the
                second line indents from a shared left edge instead of reading
                as off-centre text. */}
            <div className="mb-4 flex justify-center sm:mb-5">
              <h1
                className="m-0 inline-block p-0 text-left font-[family-name:var(--font-script)] leading-[1.2]"
                style={{
                  color: GREEN,
                  // Rouge Script sets narrow, so it needs a larger size than a
                  // copperplate face to fill the same measure. Sized off the first
                  // line's length to keep it on one row inside the 468px card.
                  fontSize: `clamp(34px, min(13.5vw, ${Math.min(72, Math.round(1040 / Math.max(titleHead.length, 10)))}px), 72px)`,
                }}
              >
                <span className="block whitespace-nowrap">{titleHead}</span>
                {titleTail && <span className="block pl-[1.2em]">{titleTail}</span>}
              </h1>
            </div>

            <div className="mb-2 flex items-center justify-center gap-2.5">
              <span style={rule('l', 56)} />
              <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden>
                <ellipse cx="7" cy="7" rx="6.5" ry="3.4" transform="rotate(-24 7 7)" fill="#A8B89A" />
                <ellipse cx="19" cy="7" rx="6.5" ry="3.4" transform="rotate(24 19 7)" fill="#A8B89A" />
                <circle cx="13" cy="7" r="3" fill="#E8B4B8" />
              </svg>
              <span style={rule('r', 56)} />
            </div>

            <p
              className="m-0 mb-3.5 font-[family-name:var(--font-cormorant)] text-[15px] uppercase tracking-[.14em] sm:mb-[18px] sm:text-[16px] sm:tracking-[.17em]"
              style={{ color: GOLD_TEXT }}
            >
              {VENUE}
              <span className="hidden sm:inline"> &middot; </span>
              <br className="sm:hidden" />
              {EVENT_DATE}
            </p>

            <p
              className="m-0 mb-[18px] font-[family-name:var(--font-playfair-display)] text-[20px] italic sm:mb-[30px] sm:text-[23px]"
              style={{ color: GREEN }}
            >
              {settings.homePageText}
            </p>
          </div>

          {settingsLoading ? (
            <div className="py-6 text-center">
              <div
                className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: `${GOLD} transparent ${GOLD} ${GOLD}` }}
              />
              <p className="font-[family-name:var(--font-cormorant)] text-[13px] uppercase" style={{ letterSpacing: '.28em', color: GOLD_TEXT }}>
                Loading
              </p>
            </div>
          ) : settings.searchEnabled ? (
            <form onSubmit={handleSearch}>
              <label
                htmlFor="search"
                className="mb-2 block font-[family-name:var(--font-cormorant)] text-[13px] uppercase"
                style={{ letterSpacing: '.28em', color: GOLD_TEXT }}
              >
                Enter your name
              </label>

              <div className="relative mb-3 sm:mb-3.5">
                <div
                  className="pointer-events-none absolute left-[15px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 sm:left-[18px]"
                  style={{ color: '#B3A488' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
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
                  required
                  autoComplete="off"
                  className="w-full rounded-full border py-3.5 pl-11 pr-4 font-[family-name:var(--font-playfair-display)] text-[16px] outline-none transition focus:border-[#C3A671] sm:py-[15px] sm:pl-12 sm:pr-[18px]"
                  style={{ borderColor: '#DFD3BC', background: '#FFFDF9', color: '#3E4F3A' }}
                />

                {showSuggestions && searchSuggestions.length > 0 && (
                  <div
                    className="animate-fadeIn absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-2xl border bg-white shadow-xl"
                    style={{ borderColor: '#DFD3BC' }}
                  >
                    {searchSuggestions.map((guest, index) => (
                      <button
                        key={guest.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectGuest(guest);
                        }}
                        className="w-full border-b px-4 py-3 text-left font-[family-name:var(--font-playfair-display)] transition-all duration-150 last:border-b-0 focus:outline-none"
                        style={{
                          borderColor: 'rgba(201,184,150,.3)',
                          background: index === selectedSuggestionIndex ? 'rgba(233,240,224,.7)' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#3E4F3A' }}>{guest.name}</span>
                          {guest.partySize > 1 && (
                            <span
                              className="ml-2 font-[family-name:var(--font-cormorant)] text-[12px] uppercase"
                              style={{ letterSpacing: '.16em', color: GOLD_TEXT }}
                            >
                              Party of {guest.partySize}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {searchSuggestions.length >= 10 && (
                      <div
                        className="px-4 py-2 text-center font-[family-name:var(--font-cormorant)] text-[12px]"
                        style={{ color: GOLD_TEXT, background: 'rgba(243,238,224,.6)' }}
                      >
                        Showing top 10 — keep typing to narrow
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full cursor-pointer rounded-full border-none py-[15px] font-[family-name:var(--font-cormorant)] text-[16px] uppercase transition disabled:opacity-60 sm:text-[17px]"
                style={{
                  background: 'linear-gradient(180deg,#C3A671,#9C7F4C)',
                  color: '#FFFDF7',
                  letterSpacing: '.28em',
                  boxShadow: '0 10px 22px -12px rgba(120,96,52,.9)',
                }}
              >
                {isSearching ? 'Searching…' : 'Find My Table'}
              </button>
            </form>
          ) : (
            <div className="py-4 text-center">
              <p
                className="m-0 mb-2 font-[family-name:var(--font-cormorant)] text-[13px] uppercase"
                style={{ letterSpacing: '.3em', color: GOLD_TEXT }}
              >
                Table search opens soon
              </p>
              <p
                className="m-0 font-[family-name:var(--font-playfair-display)] text-[17px] italic"
                style={{ color: '#7D8C74' }}
              >
                Seating will be revealed on the day of the celebration.
              </p>
            </div>
          )}
        </div>

        {/* ---- Result ---- */}
        {foundGuest && (
          <div
            className="relative mt-4 p-[22px] text-center sm:mt-[18px] sm:p-[26px]"
            style={{
              background:
                'linear-gradient(140deg,rgba(243,217,220,.6),rgba(255,255,255,.92) 46%,rgba(168,184,154,.38))',
              border: '1px solid rgba(201,184,150,.55)',
              borderRadius: 22,
              boxShadow: '0 18px 40px -28px rgba(74,95,69,.7)',
            }}
          >
            <p
              className="m-0 mb-2 font-[family-name:var(--font-cormorant)] text-[13px] uppercase sm:mb-2.5 sm:text-[14px]"
              style={{ letterSpacing: '.3em', color: GOLD_TEXT }}
            >
              Welcome, {foundGuest.name}
            </p>

            {guestTable ? (
              <>
                <div className="inline-flex items-center gap-3.5">
                  <span className="hidden sm:block" style={rule('flat', 34)} />
                  <span
                    className="font-[family-name:var(--font-playfair-display)] text-[42px] sm:text-[46px]"
                    style={{ color: GREEN, letterSpacing: '.04em' }}
                  >
                    {guestTable.name}
                  </span>
                  <span className="hidden sm:block" style={rule('flat', 34)} />
                </div>
                <p
                  className="m-0 mt-2.5 font-[family-name:var(--font-playfair-display)] text-[16px] italic sm:text-[17px]"
                  style={{ color: '#7D8C74' }}
                >
                  {partySize > 1
                    ? `${partySize} seats reserved in your name`
                    : 'One seat reserved in your name'}
                </p>
              </>
            ) : (
              <p
                className="m-0 font-[family-name:var(--font-playfair-display)] text-[17px] italic"
                style={{ color: '#7D8C74' }}
              >
                Your table is still being arranged — please check back a little later.
              </p>
            )}
          </div>
        )}

        {/* ---- Address ---- */}
        {showAddressForm && foundGuest && settings.addressCollectionEnabled && (
          <div
            className="relative mt-4 p-[22px] sm:p-[26px]"
            style={{
              background: 'linear-gradient(180deg,rgba(255,253,248,.94),rgba(255,251,244,.88))',
              border: '1px solid rgba(201,184,150,.55)',
              borderRadius: 22,
              boxShadow: '0 18px 40px -28px rgba(74,95,69,.7)',
            }}
          >
            <p
              className="m-0 mb-3 text-center font-[family-name:var(--font-cormorant)] text-[13px] uppercase"
              style={{ letterSpacing: '.3em', color: GOLD_TEXT }}
            >
              Share your address
            </p>
            <form onSubmit={handleAddressUpdate}>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete mailing address..."
                required
                className="mb-3 h-20 w-full rounded-2xl border px-4 py-3 font-[family-name:var(--font-playfair-display)] text-[16px] outline-none transition focus:border-[#C3A671]"
                style={{ borderColor: '#DFD3BC', background: '#FFFDF9', color: '#3E4F3A' }}
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isUpdatingAddress}
                  className="flex-1 cursor-pointer rounded-full border-none py-3 font-[family-name:var(--font-cormorant)] text-[15px] uppercase transition disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(180deg,#C3A671,#9C7F4C)',
                    color: '#FFFDF7',
                    letterSpacing: '.24em',
                  }}
                >
                  {isUpdatingAddress ? 'Saving…' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="cursor-pointer rounded-full border bg-transparent px-6 py-3 font-[family-name:var(--font-cormorant)] text-[15px] uppercase transition"
                  style={{ borderColor: '#DFD3BC', color: GOLD_TEXT, letterSpacing: '.24em' }}
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Butterflies in front */}
      <div className="pointer-events-none absolute inset-0 z-[5] hidden sm:block">
        {BUTTERFLIES_FRONT.map((b) => (
          <Butterfly key={b.id} b={b} />
        ))}
      </div>

      {/* Mobile keeps a lighter cast, clear of the card text */}
      <div className="pointer-events-none absolute inset-0 z-[5] sm:hidden">
        <Butterfly b={{ ...BUTTERFLIES[0], left: '4%', top: '11%', w: 54, h: 44 }} />
        <Butterfly b={{ ...BUTTERFLIES_FRONT[1], left: '8%', top: '84%', w: 40, h: 32 }} />
      </div>
    </div>
  );
}
