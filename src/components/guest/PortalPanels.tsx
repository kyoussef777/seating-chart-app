'use client';

import { useEffect, useRef, useState } from 'react';
import type { EventTemplate } from '@/lib/templates';
import type { GuestPortal } from '@/hooks/useGuestPortal';
import { fitFontSize, longestBalancedLine, splitCouple } from '@/lib/display-text';

/**
 * The parts of the guest portal every template shares: the search box, the
 * table result and the address request.
 *
 * They are driven entirely by the template's palette and shape tokens, so a
 * template component only has to supply scenery and a frame.
 *
 * Each piece carries a stable `portal-*` class. They have no styles of their
 * own; a template scopes its motion to them in globals.css (`.wedding-portal
 * .portal-title`, …) so the choreography belongs to the look, not to the panel.
 */

interface PanelProps {
  template: EventTemplate;
  portal: GuestPortal;
}

/**
 * `card` is a free-standing panel below the template's own card. `inset` is
 * drawn inside it — no box of its own, just a divider — for templates that
 * keep the whole exchange on one sheet of stationery.
 */
type PanelVariant = 'card' | 'inset';

/** Admin-typed copy can hold one unbroken run longer than the card is wide. */
const WRAP_ANYWHERE = '[overflow-wrap:anywhere]';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A hairline rule that fades out towards `dir`, or a flat one. */
export function Rule({
  color,
  width,
  dir = 'flat',
  className,
}: {
  color: string;
  width: number;
  dir?: 'l' | 'r' | 'flat';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        width,
        height: 1,
        flexShrink: 0,
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
  className = '',
}: {
  template: EventTemplate;
  children: React.ReactNode;
  tracking?: string;
  className?: string;
}) {
  return (
    <span
      className={`text-[12px] uppercase sm:text-[13px] ${className}`}
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

/**
 * A Coptic cross between fading rules: each arm flares into the three knobs of
 * the Trinity, with a small boss at the crossing.
 */
function Ornament({ template, className = '' }: { template: EventTemplate; className?: string }) {
  const { palette } = template;
  return (
    <div aria-hidden className={`flex items-center justify-center gap-2.5 ${className}`}>
      <Rule color={palette.accent} width={56} dir="l" className="portal-rule-l" />
      <svg className="portal-bloom" width="16" height="16" viewBox="-17 -17 34 34">
        <g fill={palette.dividerCross}>
          {[0, 90, 180, 270].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M-2.2 0 L-3.6 -11 Q0 -12.4 3.6 -11 L2.2 0 Z" />
              <circle cy="-14.3" r="2.7" />
              <circle cy="-11.9" r="2.6" />
              <circle cx="-3.7" cy="-11.6" r="2.4" />
              <circle cx="3.7" cy="-11.6" r="2.4" />
            </g>
          ))}
          <circle r="4.6" />
        </g>
        <circle r="2" fill={palette.dividerCentre} />
      </svg>
      <Rule color={palette.accent} width={56} dir="r" className="portal-rule-r" />
    </div>
  );
}

/**
 * The event name. Sized from its own length so a two-word name fills the card
 * and an eighty-character one still fits a 320px phone without running off
 * either edge.
 */
function EventTitle({ template, name }: { template: EventTemplate; name: string }) {
  const { palette, fonts } = template;
  const uppercase = template.displayCase === 'uppercase';
  const style: React.CSSProperties = {
    fontFamily: fonts.display,
    color: palette.heading,
    letterSpacing: template.displayTracking,
    textTransform: uppercase ? 'uppercase' : 'none',
  };
  const className = `m-0 inline-block max-w-full p-0 text-center leading-[1.2] ${WRAP_ANYWHERE}`;

  if (template.titleLayout === 'couple') {
    const fit = { charEm: template.displayCharEm, maxPx: 46, minPx: 22 };
    const couple = splitCouple(name);

    if (!couple) {
      return (
        <h1 className={className} style={{ ...style, fontSize: fitFontSize(name, { ...fit, maxLines: 3 }) }}>
          <span className="portal-title-line block text-balance">{name}</span>
        </h1>
      );
    }

    // One line — "MIRA & KAMAL" — with the joiner set small and italic. Only
    // when that line would drop below a comfortable size does it break, and
    // then at the joiner: "ALEXANDRINA MONTGOMERY / & BARTHOLOMEW CHRISTOPHERSON".
    // In CSS: the one-line size if it is at least 24px, else the two-line size.
    const joiner = couple.joiner.toLowerCase() === 'and' ? 'and' : '&';
    const tail = `${joiner} ${couple.second}`;
    const em = (chars: number) => Math.round(Math.max(1, chars) * template.displayCharEm * 100) / 100;
    const oneLine = em(longestBalancedLine(`${couple.first} ${tail}`, 1));
    const twoLines = em(Math.max(longestBalancedLine(couple.first, 2), longestBalancedLine(tail, 2)));
    const fontSize = `clamp(${fit.minPx}px, max(calc(100cqi / ${oneLine}), min(calc(100cqi / ${twoLines}), 24px)), ${fit.maxPx}px)`;

    return (
      <h1 className={`${className} text-balance`} aria-label={name} style={{ ...style, lineHeight: 1.2, fontSize }}>
        <span aria-hidden className="portal-title-line inline-block">
          {couple.first}
        </span>{' '}
        <span aria-hidden className="inline-block">
          <span
            className="portal-title-joiner inline-block"
            style={{
              fontFamily: fonts.body,
              fontStyle: 'italic',
              textTransform: 'none',
              letterSpacing: 0,
              color: palette.accentText,
              fontSize: '0.8em',
              // Pull back over the first name's trailing tracking so the
              // ampersand sits evenly between the two names.
              margin: '0 .45em 0 -.15em',
            }}
          >
            {joiner}
          </span>
          <span className="portal-title-line inline-block">{couple.second}</span>
        </span>
      </h1>
    );
  }

  // `last-word`: the final word drops to a second line so long names keep a
  // readable display size. Both lines stay centred and may wrap again rather
  // than overflow.
  const words = name.trim().split(/\s+/);
  const tail = words.length > 1 ? words[words.length - 1] : '';
  const head = tail ? words.slice(0, -1).join(' ') : name;
  const longestLine = Math.max(head.length, tail.length, 10);
  const cap = uppercase ? 46 : 72;
  const size = Math.min(cap, Math.round((uppercase ? 760 : 1040) / longestLine));

  return (
    <h1 className={className} style={{ ...style, fontSize: `clamp(30px, min(12vw, ${size}px), ${cap}px)` }}>
      <span className="portal-title-line block text-balance">{head}</span>
      {tail && <span className="portal-title-line block">{tail}</span>}
    </h1>
  );
}

/** Event name, venue and welcome copy — identical content, template typography. */
export function PortalHeader({ template, portal }: PanelProps) {
  const { palette, fonts } = template;
  const { settings } = portal;

  // Long lines lose the side rules and some tracking: wide-spaced capitals
  // wrapped over three lines read as a wall rather than a heading.
  const kicker = settings.eventKicker;
  const longKicker = kicker.length > 24;
  const kickerTracking = longKicker ? '.24em' : '.44em';

  const meta = [settings.venueName, settings.eventDate].filter(Boolean);
  const longMeta = meta.join(' · ').length > 40;
  const longWelcome = settings.homePageText.length > 140;

  return (
    // `container-type` lets the title size itself against this card's width.
    <div className="portal-header text-center [container-type:inline-size]">
      {kicker && (
        <div className="portal-kicker mb-4 flex items-center justify-center gap-3 sm:mb-5 sm:px-8">
          {/* The side rules drop out on the narrowest phones, where they would
              squeeze even a short kicker onto three lines. */}
          {!longKicker && <Rule color={palette.accent} width={40} className="hidden min-[360px]:block" />}
          {/* Tracking trails the last letter too; pad the front to match so
              the words sit on the true centre. */}
          <span className={`block text-balance leading-[1.75] ${WRAP_ANYWHERE}`} style={{ paddingLeft: kickerTracking }}>
            <Eyebrow template={template} tracking={kickerTracking}>
              {kicker}
            </Eyebrow>
          </span>
          {!longKicker && <Rule color={palette.accent} width={40} className="hidden min-[360px]:block" />}
        </div>
      )}

      <div className="portal-title mb-4 flex justify-center sm:mb-5">
        <EventTitle template={template} name={settings.eventName} />
      </div>

      <Ornament template={template} className="portal-ornament mb-2" />

      {meta.length > 0 && (
        <div
          className={`portal-venue m-0 mb-3.5 uppercase sm:mb-[18px] ${WRAP_ANYWHERE}`}
          style={{ fontFamily: fonts.label, color: palette.accentText }}
        >
          {longMeta ? (
            meta.map((line) => (
              <p key={line} className="m-0 text-balance text-[13px] leading-[1.65] tracking-[.12em] sm:text-[14px] sm:tracking-[.14em]">
                {line}
              </p>
            ))
          ) : (
            <p className="m-0 text-[15px] tracking-[.14em] sm:text-[16px] sm:tracking-[.17em]">
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
        </div>
      )}

      <p
        className={`portal-welcome m-0 mb-[18px] italic text-pretty sm:mb-[30px] ${WRAP_ANYWHERE} ${
          longWelcome ? 'text-[18px] leading-[1.45] sm:text-[20px]' : 'text-[20px] sm:text-[23px]'
        }`}
        style={{ fontFamily: fonts.body, color: palette.heading }}
      >
        {settings.homePageText}
      </p>
    </div>
  );
}

export function PortalSearchPanel({ template, portal }: PanelProps) {
  const { palette, shape, fonts } = template;
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="portal-search py-4 text-center">
        <p className="m-0 mb-2">
          <Eyebrow template={template} tracking=".3em">
            Table search opens soon
          </Eyebrow>
        </p>
        <p
          className={`m-0 text-pretty text-[17px] italic ${WRAP_ANYWHERE}`}
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          {portal.settings.searchClosedMessage}
        </p>
      </div>
    );
  }

  const listOpen = portal.showSuggestions && portal.suggestions.length > 0;
  // A slow pulse draws the eye to the one thing to do here, and stops for
  // good once the guest has started.
  const beckon = !focused && !portal.searchName && !portal.foundGuest;

  return (
    <form onSubmit={portal.onSubmit} className="portal-search">
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
          ref={inputRef}
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
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls="guest-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            listOpen && portal.highlightedIndex >= 0 ? `guest-option-${portal.highlightedIndex}` : undefined
          }
          className={`portal-input w-full border py-3.5 pl-11 pr-12 text-[16px] outline-none sm:py-[15px] sm:pl-12 ${
            beckon ? 'portal-beckon' : ''
          }`}
          style={{
            fontFamily: fonts.body,
            borderRadius: shape.input,
            borderColor: focused ? palette.inputFocusBorder : palette.inputBorder,
            background: palette.inputBackground,
            color: palette.inputText,
            boxShadow: focused ? `0 0 0 4px ${palette.accent}26` : `0 0 0 0 ${palette.accent}00`,
            transition: 'border-color 250ms ease, box-shadow 350ms ease',
          }}
        />

        {portal.searchName && (
          <button
            type="button"
            aria-label="Clear name"
            onClick={() => {
              portal.clearResult();
              inputRef.current?.focus();
            }}
            className="portal-clear absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent opacity-60 transition-opacity hover:opacity-100"
            style={{ color: palette.accentText }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}

        {listOpen && (
          <div
            id="guest-suggestions"
            role="listbox"
            className="portal-suggestions animate-fadeIn absolute z-20 mt-1 max-h-[min(20rem,50vh)] w-full overflow-y-auto border bg-white shadow-xl"
            style={{ borderColor: palette.inputBorder, borderRadius: shape.panel }}
          >
            {portal.suggestions.map((guest, index) => (
              <button
                key={guest.id}
                id={`guest-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === portal.highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  portal.selectGuest(guest);
                }}
                className="portal-option w-full cursor-pointer border-b px-4 py-3 text-left transition-colors duration-150 last:border-b-0 focus:outline-none"
                style={{
                  fontFamily: fonts.body,
                  borderColor: `${palette.accent}40`,
                  background: index === portal.highlightedIndex ? `${palette.accent}33` : undefined,
                  ['--i' as string]: index,
                }}
              >
                {/* Wraps rather than squeezing: a long name takes the full row
                    and the party size drops beneath it. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 [overflow-wrap:break-word]" style={{ color: palette.body }}>
                    {guest.name}
                  </span>
                  {guest.partySize > 1 && (
                    <span
                      className="shrink-0 whitespace-nowrap text-[12px] uppercase"
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
        className="portal-button relative w-full cursor-pointer overflow-hidden border-none py-[15px] text-[16px] uppercase transition disabled:opacity-60 sm:text-[17px]"
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
          className="portal-error m-0 mt-3 text-pretty text-center text-[15px] italic"
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          {portal.searchError}
        </p>
      )}
    </form>
  );
}

/**
 * Bring a panel that has just appeared into view. On a phone the result lands
 * below the keyboard and the fold, so without this a guest taps a name and
 * sees nothing happen.
 */
function useRevealOnChange(key: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!key) return;
    const search = document.getElementById('search');
    // Dismiss the on-screen keyboard; it would cover the answer.
    if (search && document.activeElement === search && window.matchMedia('(pointer: coarse)').matches) {
      search.blur();
    }
    // Wait for the keyboard to go and the entrance to start before measuring.
    const timer = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: rect.height > window.innerHeight * 0.8 ? 'start' : 'center',
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [key]);

  return ref;
}

export function PortalResultPanel({
  template,
  portal,
  variant = 'card',
}: PanelProps & { variant?: PanelVariant }) {
  const { palette, shape, fonts } = template;
  const { foundGuest, guestTable, partySize } = portal;
  const ref = useRevealOnChange(foundGuest?.id);

  if (!foundGuest) return null;

  const inset = variant === 'inset';
  const longName = foundGuest.name.length > 22;
  const shortTable = guestTable ? guestTable.name.length <= 12 : false;

  const searchAgain = () => {
    portal.clearResult();
    const input = document.getElementById('search');
    if (!input) return;
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <div
      ref={ref}
      // Keyed so a second lookup replays the entrance instead of swapping text.
      key={foundGuest.id}
      role="status"
      className={`portal-result relative text-center [container-type:inline-size] ${
        inset ? 'mt-7 pt-7 sm:mt-8 sm:pt-8' : 'mt-4 p-[22px] sm:mt-[18px] sm:p-[26px]'
      }`}
      style={
        inset
          ? undefined
          : {
              background: palette.resultBackground,
              border: `1px solid ${palette.surfaceBorder}`,
              borderRadius: shape.panel,
              boxShadow: palette.surfaceShadow,
            }
      }
    >
      {inset && <Ornament template={template} className="portal-result-divider absolute inset-x-0 top-0 -translate-y-1/2" />}

      <p className={`portal-result-welcome m-0 mb-2 text-balance sm:mb-2.5 ${WRAP_ANYWHERE}`}>
        <Eyebrow template={template} tracking={longName ? '.18em' : '.3em'}>
          Welcome, {foundGuest.name}
        </Eyebrow>
      </p>

      {guestTable ? (
        <>
          {inset && (
            <p
              className="portal-result-lead m-0 mb-1 text-[16px] italic sm:text-[17px]"
              style={{ fontFamily: fonts.body, color: palette.muted }}
            >
              {/* A bare number reads better as "…at table / 7" than "…at / 7". */}
              {/^\d+$/.test(guestTable.name.trim()) ? 'You are seated at table' : 'You are seated at'}
            </p>
          )}
          <div className="portal-table inline-flex max-w-full items-center gap-3.5">
            {shortTable && (
              <span className="hidden sm:block">
                <Rule color={palette.accent} width={34} />
              </span>
            )}
            <span
              className={`min-w-0 text-balance leading-[1.15] ${WRAP_ANYWHERE}`}
              style={{
                fontFamily: fonts.body,
                color: palette.heading,
                letterSpacing: '.04em',
                fontSize: fitFontSize(guestTable.name, { maxLines: 2, charEm: 0.52, maxPx: 46, minPx: 26 }),
              }}
            >
              {guestTable.name}
            </span>
            {shortTable && (
              <span className="hidden sm:block">
                <Rule color={palette.accent} width={34} />
              </span>
            )}
          </div>
          {template.id !== 'bridal-shower' && (
            <p
              className="portal-result-seats m-0 mt-2.5 text-[16px] italic sm:text-[17px]"
              style={{ fontFamily: fonts.body, color: palette.muted }}
            >
              {partySize > 1
                ? `${partySize} seats reserved in your name`
                : 'One seat reserved in your name'}
            </p>
          )}
        </>
      ) : (
        <p
          className="portal-result-pending m-0 text-pretty text-[17px] italic"
          style={{ fontFamily: fonts.body, color: palette.muted }}
        >
          Your table is still being arranged — please check back a little later.
        </p>
      )}

      <button
        type="button"
        onClick={searchAgain}
        className="portal-again mt-3 inline-flex min-h-11 cursor-pointer items-center border-none bg-transparent px-3 text-[12px] uppercase underline-offset-[6px] hover:underline sm:text-[13px]"
        style={{
          fontFamily: fonts.label,
          letterSpacing: '.22em',
          color: palette.accentText,
          textDecorationColor: `${palette.accent}99`,
        }}
      >
        Search another name
      </button>
    </div>
  );
}

export function PortalAddressPanel({
  template,
  portal,
  variant = 'card',
}: PanelProps & { variant?: PanelVariant }) {
  const { palette, shape, fonts } = template;

  if (!portal.foundGuest || !portal.settings.addressCollectionEnabled) return null;

  const inset = variant === 'inset';

  if (portal.addressSaved) {
    return (
      <p
        role="status"
        className="portal-saved m-0 mt-4 flex items-center justify-center gap-2 text-center text-[16px] italic"
        style={{ fontFamily: fonts.body, color: palette.muted }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={palette.accent} strokeWidth="1.2" />
          <path className="portal-saved-tick" d="M7.5 12.5l3 3 6-6.5" pathLength={1} stroke={palette.accentText} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Thank you — your address is saved.
      </p>
    );
  }

  if (!portal.showAddressForm) return null;

  return (
    <div
      className={`portal-address relative ${inset ? 'mt-3 pt-6' : 'mt-4 p-[22px] sm:p-[26px]'}`}
      style={
        inset
          ? undefined
          : {
              background: palette.surface,
              border: `1px solid ${palette.surfaceBorder}`,
              borderRadius: shape.panel,
              boxShadow: palette.surfaceShadow,
            }
      }
    >
      {inset && (
        <span aria-hidden className="absolute left-1/2 top-0 -translate-x-1/2">
          <Rule color={`${palette.accent}88`} width={64} />
        </span>
      )}
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
          autoComplete="street-address"
          required
          className="mb-3 h-20 w-full resize-none border px-4 py-3 text-[16px] outline-none transition"
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
            className="portal-button relative flex-1 cursor-pointer overflow-hidden whitespace-nowrap border-none py-3 text-[15px] uppercase tracking-[.16em] transition disabled:opacity-60 sm:tracking-[.24em]"
            style={{
              fontFamily: fonts.label,
              borderRadius: shape.button,
              background: palette.buttonBackground,
              color: palette.buttonText,
            }}
          >
            {portal.isUpdatingAddress ? 'Saving…' : 'Save Address'}
          </button>
          <button
            type="button"
            onClick={portal.skipAddress}
            className="cursor-pointer whitespace-nowrap border bg-transparent px-4 py-3 text-[15px] uppercase tracking-[.16em] transition sm:px-6 sm:tracking-[.24em]"
            style={{
              fontFamily: fonts.label,
              borderRadius: shape.button,
              borderColor: palette.inputBorder,
              color: palette.accentText,
            }}
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
