'use client';

import { EVENT_TEMPLATES } from '@/lib/templates';
import type { GuestPortal } from '@/hooks/useGuestPortal';
import {
  PortalAddressPanel,
  PortalHeader,
  PortalResultPanel,
  PortalSearchPanel,
} from '@/components/guest/PortalPanels';

/**
 * A classic French estate: white Carrara marble, gold leaf and crystal, after
 * the Park Savoy — the 1870 mansion with a two-storey columned portico, a
 * ballroom of crystal chandeliers under coffered ceilings, and black shutters
 * on a white facade. Drawn in fine gold line rather than photographed, so it
 * suits any couple without art direction.
 *
 * The whole exchange — name, search, table, address — stays on the one
 * moulded panel, so the answer appears where the guest is already looking.
 * Motion lives in globals.css under `.wedding-portal`: the frame settles, the
 * portico draws itself, the copy rises line by line down to the search box,
 * and on wider screens a chandelier sways and glints above the card. All of it
 * is off under reduced motion.
 */

const template = EVENT_TEMPLATES.wedding;
const { palette } = template;

/** The estate's portico: pediment and oculus over four two-storey columns. */
function Portico() {
  const columns = [22, 42, 78, 98];
  return (
    <svg className="wed-crest" width="104" height="58" viewBox="0 0 120 66" aria-hidden>
      <g fill="none" stroke={palette.accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 24 L60 5 L112 24 Z" pathLength={1} />
        <path d="M19 21.5 L60 9.5 L101 21.5" pathLength={1} opacity=".6" />
        <circle cx="60" cy="16" r="3.2" pathLength={1} />
        <path d="M6 24 H114 V28.5 H6 Z" pathLength={1} />
        {columns.map((x) => (
          <path
            key={x}
            d={`M${x - 4.2} 30.5 H${x + 4.2} M${x - 2.4} 30.5 V54.5 M${x + 2.4} 30.5 V54.5 M${x - 3.8} 54.5 H${x + 3.8}`}
            pathLength={1}
          />
        ))}
        {/* Shuttered windows in the outer bays, the door in the centre. */}
        <path d="M29 36 h6 v11 h-6 Z M85 36 h6 v11 h-6 Z" pathLength={1} opacity=".75" />
        <path d="M55 54.5 V45 A5 5 0 0 1 65 45 V54.5" pathLength={1} />
        <path d="M8 56.5 H112 M4 60 H116 M0 63.5 H120" pathLength={1} opacity=".8" />
      </g>
    </svg>
  );
}

/** A gilded rosette, set where the panel moulding turns a corner. */
function Rosette({ className }: { className: string }) {
  return (
    <svg className={`wed-rosette absolute ${className}`} width="16" height="16" viewBox="-8 -8 16 16" aria-hidden>
      <circle r="6.6" fill="#FFFDF7" stroke={palette.accent} strokeWidth=".8" />
      {[0, 45, 90, 135].map((a) => (
        <ellipse key={a} rx="4.6" ry="1.5" transform={`rotate(${a})`} fill={palette.accent} opacity=".55" />
      ))}
      <circle r="1.6" fill={palette.accent} />
    </svg>
  );
}

/** A crystal chandelier from the ballroom, two tiers of candles and drops. */
function Chandelier() {
  const lowerArms = [
    'M70 62 C52 78 24 76 22 58',
    'M70 62 C60 72 48 70 46 58',
    'M70 62 C80 72 92 70 94 58',
    'M70 62 C88 78 116 76 118 58',
  ];
  const lowerCandles = [22, 46, 94, 118];
  const upperCandles = [50, 90];

  const candle = (x: number, base: number, i: number) => (
    <g key={`c${x}-${base}`}>
      <path d={`M${x - 5} ${base} H${x + 5}`} />
      <rect x={x - 1.8} y={base - 11} width="3.6" height="11" fill="#FFFDF7" />
      <ellipse
        className="wed-flame"
        cx={x}
        cy={base - 14.5}
        rx="1.7"
        ry="3"
        fill="#E7C66E"
        stroke="none"
        style={{ ['--i' as string]: i }}
      />
    </g>
  );

  const drop = (x: number, y: number, i: number, size = 1) => (
    <g key={`d${x}-${y}`} className="wed-crystal" style={{ ['--i' as string]: i }}>
      <path d={`M${x} ${y} V${y + 5 * size}`} strokeWidth=".6" />
      <path
        d={`M${x} ${y + 5 * size} l${2.6 * size} ${4 * size} l-${2.6 * size} ${5.5 * size} l-${2.6 * size} -${5.5 * size} Z`}
        fill="#FFFFFF"
        fillOpacity=".7"
      />
    </g>
  );

  return (
    <svg width="128" height="110" viewBox="0 0 140 120" aria-hidden className="block">
      <g fill="none" stroke={palette.accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        {/* Stem and urn */}
        <path d="M70 0 V62" />
        <path d="M63 28 Q70 21 77 28 Q79 39 70 45 Q61 39 63 28 Z" fill="#FFFDF7" />
        <path d="M60 62 H80" />
        {/* Upper tier */}
        <path d="M70 32 C61 40 52 38 50 26 M70 32 C79 40 88 38 90 26" />
        {upperCandles.map((x, i) => candle(x, 26, i + 4))}
        {/* Lower tier */}
        {lowerArms.map((d) => (
          <path key={d} d={d} />
        ))}
        {lowerCandles.map((x, i) => candle(x, 58, i))}
        {/* Beaded crystal swags between the arms */}
        <path
          d="M22 60 Q34 76 46 60 M46 60 Q58 72 70 66 Q82 72 94 60 M94 60 Q106 76 118 60"
          strokeWidth="1.6"
          strokeDasharray="0.1 3.2"
          opacity=".8"
        />
        {lowerCandles.map((x, i) => drop(x, 60, i))}
        {drop(70, 66, 5, 1.6)}
      </g>
    </svg>
  );
}

/** Faint Carrara veining, drawn once and stretched across the page. */
function Marble() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g fill="none" stroke="#B9B1A3" strokeLinecap="round">
        <path
          d="M-5 18 C 12 22, 18 34, 30 33 S 52 44, 61 58 S 84 70, 105 92"
          strokeWidth="1.1"
          opacity=".22"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M30 33 C 34 40, 33 47, 40 52"
          strokeWidth=".7"
          opacity=".18"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M105 6 C 88 12, 82 24, 70 26 S 56 30, 48 22"
          strokeWidth=".8"
          opacity=".16"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-5 70 C 8 66, 16 74, 24 80 S 40 96, 46 105"
          strokeWidth=".9"
          opacity=".18"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M61 58 C 66 56, 72 60, 78 57"
          strokeWidth=".6"
          opacity=".16"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

export default function WeddingTemplate({ portal }: { portal: GuestPortal }) {
  return (
    // `overflow-x-clip`, not `overflow-hidden`: the suggestion list hangs below
    // the card and must be able to extend the page, not be cut off by it.
    <div className="wedding-portal relative min-h-[100svh] overflow-x-clip">
      {/* Scenery is pinned to the screen rather than the page: the page grows
          when the suggestion list opens, and a backdrop that ended with the
          old height left a seam (or bare body) below it. Clipped in its own
          layer so the drifting light never lengthens the page either. */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ background: palette.pageBackground }}
      >
        <Marble />
        {/* Chandelier light pooling from above, and a soft floor glow. */}
        <div
          className="wed-glow absolute -inset-[10%]"
          style={{
            background:
              'radial-gradient(38% 26% at 50% 4%,rgba(255,240,205,.55),transparent 72%),radial-gradient(40% 28% at 10% 10%,rgba(255,255,255,.85),transparent 70%),radial-gradient(46% 32% at 90% 96%,rgba(222,212,192,.45),transparent 72%)',
          }}
        />
      </div>

      <main className="relative mx-auto flex min-h-[100svh] w-full max-w-[560px] flex-col justify-center px-[22px] py-10 sm:px-4 sm:pt-40 sm:pb-16">
        <div className="relative">
          {/* Hangs from the top of the screen to just above the frame. */}
          <div className="wed-chandelier pointer-events-none absolute bottom-[calc(100%+20px)] left-1/2 hidden -translate-x-1/2 flex-col items-center sm:flex">
            <div
              className="h-[100vh] w-px"
              style={{ background: `linear-gradient(180deg,transparent,${palette.accent} 60%)` }}
            />
            <Chandelier />
          </div>

          {/* Double gold rule around the card. Tighter on a phone so the outer
              line keeps clear of the screen edge. */}
          <div
            className="wed-frame-outer pointer-events-none absolute -inset-3 sm:-inset-3.5"
            style={{ border: `1px solid ${palette.accent}` }}
          />
          <div
            className="wed-frame-inner pointer-events-none absolute -inset-1.5 sm:-inset-[7px]"
            style={{ border: `1px solid ${palette.accent}66` }}
          />

          <div
            className="wed-card relative px-6 pt-8 pb-9 sm:px-12 sm:pt-10 sm:pb-11"
            style={{ background: palette.surface, boxShadow: palette.surfaceShadow }}
          >
            {/* Boiserie: a moulded panel inset in the card, gilded rosettes at
                its corners — the ballroom walls in one line. */}
            <div
              className="wed-panel pointer-events-none absolute inset-2.5 sm:inset-4"
              style={{ border: `1px solid ${palette.accent}59` }}
            >
              <Rosette className="-left-2 -top-2" />
              <Rosette className="-right-2 -top-2" />
              <Rosette className="-bottom-2 -left-2" />
              <Rosette className="-bottom-2 -right-2" />
            </div>

            <div className="mb-4 flex justify-center sm:mb-5">
              <Portico />
            </div>

            <div
              className="relative"
              style={{
                // Copy is legible while settings load; it settles to full
                // strength once they resolve rather than snapping.
                opacity: portal.settingsLoading ? 0.62 : 1,
                transition: 'opacity 700ms cubic-bezier(0.2,0.7,0.3,1)',
              }}
            >
              <PortalHeader template={template} portal={portal} />
            </div>
            <div className="relative">
              <PortalSearchPanel template={template} portal={portal} />
              <PortalResultPanel template={template} portal={portal} variant="inset" />
              <PortalAddressPanel template={template} portal={portal} variant="inset" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
