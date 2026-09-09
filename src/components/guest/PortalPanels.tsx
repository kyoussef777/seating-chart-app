'use client';

import { useState } from 'react';
import type { EventTemplate } from '@/lib/templates';
import type { GuestPortal } from '@/hooks/useGuestPortal';

/**
 * The parts of the guest portal every template shares: the search box, the
 * table result and the address request.
 *
 * They are driven entirely by the template's palette and shape tokens, so a
 * template component only has to supply scenery and a frame.
 */

interface PanelProps {
  template: EventTemplate;
  portal: GuestPortal;
}

/** A hairline rule that fades out towards `dir`, or a flat one. */
export function Rule({ color, width, dir = 'flat' }: { color: string; width: number; dir?: 'l' | 'r' | 'flat' }) {
  return (
    <span
      aria-hidden
      style={{
        width,
        height: 1,
        background:
          dir === 'flat'
            ? color
            : `linear-gradient(${dir === 'l' ? '90deg' : '270deg'},transparent,${color})`,
      }}
    />
  );
}

/** Small-caps eyebrow used for labels and section markers. */
export function Eyebrow({
  template,
  children,
  tracking = '.28em',
}: {
  template: EventTemplate;
  children: React.ReactNode;
  tracking?: string;
}) {
  return (
    <span
      className="text-[12px] uppercase sm:text-[13px]"
      style={{
        fontFamily: template.fonts.label,
        letterSpacing: tracking,
        color: template.palette.accentText,
      }}
    >
      {children}
    </span>
  );
}

/** Event name, venue and welcome copy — identical content, template typography. */
export function PortalHeader({ template, portal }: PanelProps) {
  const { palette, fonts } = template;
  const { settings } = portal;

  // The last word of the name drops to an indented second line, which is what
  // gives the script faces their hand-lettered balance.
  const words = settings.eventName.trim().split(/\s+/);
  const tail = words.length > 1 ? words[words.length - 1] : '';
  const head = tail ? words.slice(0, -1).join(' ') : settings.eventName;
  const longestLine = Math.max(head.length, tail.length, 10);
  const cap = template.displayCase === 'uppercase' ? 46 : 72;
  const size = Math.min(cap, Math.round((template.displayCase === 'uppercase' ? 760 : 1040) / longestLine));

  return (
    <div className="text-center">
      {settings.eventKicker && (
        <div className="mb-4 flex items-center justify-center gap-3 sm:mb-5">
          <Rule color={palette.accent} width={40} />
          <Eyebrow template={template} tracking=".44em">
            {settings.eventKicker}
          </Eyebrow>
          <Rule color={palette.accent} width={40} />
        </div>
      )}

      <div className="mb-4 flex justify-center sm:mb-5">
        <h1
          className="m-0 inline-block p-0 text-left leading-[1.2]"
          style={{
            fontFamily: fonts.display,
            color: palette.heading,
            letterSpacing: template.displayTracking,
            textTransform: template.displayCase === 'uppercase' ? 'uppercase' : 'none',
            fontSize: `clamp(30px, min(12vw, ${size}px), ${cap}px)`,
          }}
        >
          <span className="block whitespace-nowrap">{head}</span>
          {tail && <span className="block pl-[1.2em]">{tail}</span>}
        </h1>
      </div>

      <div className="mb-2 flex items-center justify-center gap-2.5">
        <Rule color={palette.accent} width={56} dir="l" />
        <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden>
          <ellipse cx="7" cy="7" rx="6.5" ry="3.4" transform="rotate(-24 7 7)" fill={palette.dividerLeaf} />
          <ellipse cx="19" cy="7" rx="6.5" ry="3.4" transform="rotate(24 19 7)" fill={palette.dividerLeaf} />
          <circle cx="13" cy="7" r="3" fill={palette.dividerBloom} />
        </svg>
        <Rule color={palette.accent} width={56} dir="r" />
      </div>

      {(settings.venueName || settings.eventDate) && (
        <p
          className="m-0 mb-3.5 text-[15px] uppercase tracking-[.14em] sm:mb-[18px] sm:text-[16px] sm:tracking-[.17em]"
          style={{ fontFamily: template.fonts.label, color: palette.accentText }}
        >
          {settings.venueName}
          {settings.venueName && settings.eventDate && (
            <>
              <span className="hidden sm:inline"> &middot; </span>
              <br className="sm:hidden" />
            </>
          )}
          {settings.eventDate}
        </p>
      )}

      <p
        className="m-0 mb-[18px] text-[20px] italic sm:mb-[30px] sm:text-[23px]"
        style={{ fontFamily: template.fonts.body, color: palette.heading }}
      >
        {settings.homePageText}
      </p>
    </div>
  );
}

export function PortalSearchPanel({ template, portal }: PanelProps) {
  const { palette, shape, fonts } = template;
  const [focused, setFocused] = useState(false);

  if (portal.settingsLoading) {
    return (
      <div className="py-6 text-center">
        <div
          className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${palette.accent} transparent ${palette.accent} ${palette.accent}` }}
        />
        <Eyebrow template={template}>Loading</Eyebrow>
      </div>
    );
  }

  if (!portal.settings.searchEnabled) {
    return (
      <div className="py-4 text-center">
        <p className="m-0 mb-2">
          <Eyebrow template={template} tracking=".3em">
            Table search opens soon
          </Eyebrow>
        </p>
        <p
          className="m-0 text-[17px] italic"
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          {portal.settings.searchClosedMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={portal.onSubmit}>
      <label htmlFor="search" className="mb-2 block">
        <Eyebrow template={template}>Enter your name</Eyebrow>
      </label>

      <div className="relative mb-3 sm:mb-3.5">
        <div
          className="pointer-events-none absolute left-[15px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 sm:left-[18px]"
          style={{ color: palette.accentText, opacity: 0.75 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <input
          type="text"
          id="search"
          value={portal.searchName}
          onChange={(e) => portal.onSearchChange(e.target.value)}
          onKeyDown={portal.onKeyDown}
          onFocus={() => {
            setFocused(true);
            portal.onFocus();
          }}
          onBlur={() => {
            setFocused(false);
            portal.onBlur();
          }}
          placeholder="Type your full name..."
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={portal.showSuggestions}
          aria-controls="guest-suggestions"
          aria-autocomplete="list"
          className="w-full border py-3.5 pl-11 pr-4 text-[16px] outline-none transition sm:py-[15px] sm:pl-12 sm:pr-[18px]"
          style={{
            fontFamily: fonts.body,
            borderRadius: shape.input,
            borderColor: focused ? palette.inputFocusBorder : palette.inputBorder,
            background: palette.inputBackground,
            color: palette.inputText,
          }}
        />

        {portal.showSuggestions && portal.suggestions.length > 0 && (
          <div
            id="guest-suggestions"
            role="listbox"
            className="animate-fadeIn absolute z-20 mt-1 max-h-80 w-full overflow-y-auto border bg-white shadow-xl"
            style={{ borderColor: palette.inputBorder, borderRadius: shape.panel }}
          >
            {portal.suggestions.map((guest, index) => (
              <button
                key={guest.id}
                type="button"
                role="option"
                aria-selected={index === portal.highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  portal.selectGuest(guest);
                }}
                className="w-full border-b px-4 py-3 text-left transition-all duration-150 last:border-b-0 focus:outline-none"
                style={{
                  fontFamily: fonts.body,
                  borderColor: `${palette.accent}40`,
                  background: index === portal.highlightedIndex ? `${palette.accent}33` : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: palette.body }}>{guest.name}</span>
                  {guest.partySize > 1 && (
                    <span
                      className="ml-2 text-[12px] uppercase"
                      style={{
                        fontFamily: fonts.label,
                        letterSpacing: '.16em',
                        color: palette.accentText,
                      }}
                    >
                      Party of {guest.partySize}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {portal.suggestionsCapped && (
              <div
                className="px-4 py-2 text-center text-[12px]"
                style={{
                  fontFamily: fonts.label,
                  color: palette.accentText,
                  background: `${palette.accent}1f`,
                }}
              >
                Showing top 10 — keep typing to narrow
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={portal.isSearching}
        className="w-full cursor-pointer border-none py-[15px] text-[16px] uppercase transition disabled:opacity-60 sm:text-[17px]"
        style={{
          fontFamily: fonts.label,
          borderRadius: shape.button,
          background: palette.buttonBackground,
          color: palette.buttonText,
          letterSpacing: '.28em',
          boxShadow: palette.buttonShadow,
        }}
      >
        {portal.isSearching ? 'Searching…' : 'Find My Table'}
      </button>

      {portal.searchError && (
        <p
          role="status"
          className="m-0 mt-3 text-center text-[15px] italic"
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          {portal.searchError}
        </p>
      )}
    </form>
  );
}

export function PortalResultPanel({ template, portal }: PanelProps) {
  const { palette, shape, fonts } = template;
  const { foundGuest, guestTable, partySize } = portal;

  if (!foundGuest) return null;

  return (
    <div
      className="relative mt-4 p-[22px] text-center sm:mt-[18px] sm:p-[26px]"
      style={{
        background: palette.resultBackground,
        border: `1px solid ${palette.surfaceBorder}`,
        borderRadius: shape.panel,
        boxShadow: palette.surfaceShadow,
      }}
    >
      <p className="m-0 mb-2 sm:mb-2.5">
        <Eyebrow template={template} tracking=".3em">
          Welcome, {foundGuest.name}
        </Eyebrow>
      </p>

      {guestTable ? (
        <>
          <div className="inline-flex items-center gap-3.5">
            <span className="hidden sm:block">
              <Rule color={palette.accent} width={34} />
            </span>
            <span
              className="text-[42px] sm:text-[46px]"
              style={{ fontFamily: fonts.body, color: palette.heading, letterSpacing: '.04em' }}
            >
              {guestTable.name}
            </span>
            <span className="hidden sm:block">
              <Rule color={palette.accent} width={34} />
            </span>
          </div>
          <p
            className="m-0 mt-2.5 text-[16px] italic sm:text-[17px]"
            style={{ fontFamily: fonts.body, color: palette.muted }}
          >
            {partySize > 1
              ? `${partySize} seats reserved in your name`
              : 'One seat reserved in your name'}
          </p>
        </>
      ) : (
        <p
          className="m-0 text-[17px] italic"
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          Your table is still being arranged — please check back a little later.
        </p>
      )}
    </div>
  );
}

export function PortalAddressPanel({ template, portal }: PanelProps) {
  const { palette, shape, fonts } = template;

  if (!portal.showAddressForm || !portal.foundGuest || !portal.settings.addressCollectionEnabled) {
    return null;
  }

  return (
    <div
      className="relative mt-4 p-[22px] sm:p-[26px]"
      style={{
        background: palette.surface,
        border: `1px solid ${palette.surfaceBorder}`,
        borderRadius: shape.panel,
        boxShadow: palette.surfaceShadow,
      }}
    >
      <p className="m-0 mb-3 text-center">
        <Eyebrow template={template} tracking=".3em">
          Share your address
        </Eyebrow>
      </p>
      <form onSubmit={portal.onAddressSubmit}>
        <label htmlFor="address" className="sr-only">
          Mailing address
        </label>
        <textarea
          id="address"
          value={portal.address}
          onChange={(e) => portal.setAddress(e.target.value)}
          placeholder="Enter your complete mailing address..."
          required
          className="mb-3 h-20 w-full border px-4 py-3 text-[16px] outline-none transition"
          style={{
            fontFamily: fonts.body,
            borderRadius: shape.panel,
            borderColor: palette.inputBorder,
            background: palette.inputBackground,
            color: palette.inputText,
          }}
        />
        {portal.addressError && (
          <p
            role="alert"
            className="m-0 mb-3 text-center text-[14px] italic"
            style={{ fontFamily: fonts.body, color: '#B4413C' }}
          >
            {portal.addressError}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={portal.isUpdatingAddress}
            className="flex-1 cursor-pointer border-none py-3 text-[15px] uppercase transition disabled:opacity-60"
            style={{
              fontFamily: fonts.label,
              borderRadius: shape.button,
              background: palette.buttonBackground,
              color: palette.buttonText,
              letterSpacing: '.24em',
            }}
          >
            {portal.isUpdatingAddress ? 'Saving…' : 'Save Address'}
          </button>
          <button
            type="button"
            onClick={portal.skipAddress}
            className="cursor-pointer border bg-transparent px-6 py-3 text-[15px] uppercase transition"
            style={{
              fontFamily: fonts.label,
              borderRadius: shape.button,
              borderColor: palette.inputBorder,
              color: palette.accentText,
              letterSpacing: '.24em',
            }}
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
