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
 * estate draws itself, the copy rises line by line down to the search box,
 * and on wider screens a chandelier sways and glints above the card. All of it
 * is off under reduced motion.
 */

const template = EVENT_TEMPLATES.wedding;
const { palette } = template;

/**
 * The Park Savoy's front, drawn from the entrance court: a long two-storey
 * clapboard house under a low hipped roof, black shutters on every window,
 * and the deep flat-roofed porch on four square pillars with a dentil cornice.
 * Under it, a lantern hangs over the front door and an iron Juliet balcony;
 * in front, the tiered fountain in its round brick court, boxwood hedges and
 * mums.
 *
 * Lit as it is on a wedding night: once the lines are drawn the windows warm
 * up one after another, the porch lantern glows, and the fairy lights wound
 * through the boxwood twinkle.
 */
function Estate() {
  const pillars = [64, 99, 141, 176];
  // [centre x, top, height] for each window, both storeys.
  const windows: [number, number, number][] = [
    [26, 47, 10], [44, 47, 10], [81, 47, 10], [159, 47, 10], [196, 47, 10], [214, 47, 10],
    [26, 63, 12], [44, 63, 12], [81, 63, 12], [159, 63, 12], [196, 63, 12], [214, 63, 12],
  ];
  const siding = Array.from({ length: 8 }, (_, i) => 44 + i * 5);
  const dentils = Array.from({ length: 33 }, (_, i) => 52 + i * 4.25);
  const hedges: [number, number, number][] = [
    // [x, y, width]
    [34, 80, 26], [70, 81, 22], [148, 81, 22], [180, 80, 26],
  ];
  const fairyLights = hedges.flatMap(([x, y, w]) =>
    Array.from({ length: Math.floor((w - 3) / 3.2) }, (_, i) => [x + 2 + i * 3.2, y + (i % 2 ? 4.2 : 1.8)] as const)
  );
  const mums: [number, number, string][] = [
    [14, 89, '#C98B8B'], [21, 91, '#D9B866'], [28, 89, '#C98B8B'],
    [212, 89, '#D9B866'], [219, 91, '#C98B8B'], [226, 89, '#D9B866'],
  ];

  return (
    <svg className="wed-crest" viewBox="0 0 240 112" aria-hidden width="100%" style={{ maxWidth: 230 }}>
      <defs>
        <radialGradient id="wed-lantern-glow">
          <stop offset="0" stopColor="#F6DC8E" stopOpacity=".9" />
          <stop offset="1" stopColor="#F6DC8E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="wed-crest-fill" fill={palette.dividerLeaf} fillOpacity=".75">
        {hedges.map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height={87 - y} rx={(87 - y) / 2} />
        ))}
      </g>
      <g className="wed-crest-fill" fill="#F7E2A0">
        {fairyLights.map(([x, y], i) => (
          <circle key={`${x}-${y}`} className="wed-twinkle" cx={x} cy={y} r=".8" style={{ ['--i' as string]: i }} />
        ))}
      </g>
      <circle className="wed-lantern" cx="120" cy="44" r="7" fill="url(#wed-lantern-glow)" />
      <g className="wed-crest-fill" fillOpacity=".8">
        {mums.map(([x, y, c]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill={c} />
        ))}
      </g>

      <g fill="none" stroke={palette.accent} strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round">
        {/* House: low hipped roof over a long clapboard front */}
        <path d="M8 40 L24 31 H216 L232 40 Z" pathLength={1} />
        <path d="M12 40 V86 M228 40 V86" pathLength={1} />
        <path d={siding.map((y) => `M12 ${y} H228`).join(' ')} pathLength={1} opacity=".18" />
        {/* Windows with their black shutters */}
        {windows.map(([x, top, h], i) => (
          <g key={`${x}-${top}`}>
            <rect
              className="wed-window"
              x={x - 3}
              y={top}
              width="6"
              height={h}
              fill="#F2D48A"
              fillOpacity=".42"
              stroke="none"
              style={{ ['--i' as string]: i }}
            />
            <path
              // Lower windows carry a small hood above them.
              d={`M${x - 3} ${top} h6 v${h} h-6 Z M${x - 3} ${top + h / 2} h6${top > 55 ? ` M${x - 4.6} ${top - 2} h9.2` : ''}`}
              pathLength={1}
            />
            <rect className="wed-crest-fill" x={x - 5.6} y={top} width="2.1" height={h} fill={palette.heading} stroke="none" fillOpacity=".75" />
            <rect className="wed-crest-fill" x={x + 3.5} y={top} width="2.1" height={h} fill={palette.heading} stroke="none" fillOpacity=".75" />
          </g>
        ))}
        {/* Centre bay: French door and Juliet balcony, front door and lamps */}
        <rect
          className="wed-window"
          x="115"
          y="45"
          width="10"
          height="13"
          fill="#F2D48A"
          fillOpacity=".42"
          stroke="none"
          style={{ ['--i' as string]: windows.length }}
        />
        <path d="M115 45 h10 v13 h-10 Z M120 45 v13" pathLength={1} />
        <path d={`M112 58.5 H128 M112 53 H128 ${[114, 117, 120, 123, 126].map((x) => `M${x} 53 V58.5`).join(' ')}`} pathLength={1} />
        <path d="M115 86 V68 H125 V86 M120 68 V86" pathLength={1} />
        <path d="M110 70 v3 M130 70 v3" pathLength={1} strokeWidth="1.6" />
        {/* Porch: dentil cornice, deep fascia, four square panelled pillars */}
        <path d="M46 19 H194 M48 22.5 H192 M50 32 H190 M50 22.5 V32 M190 22.5 V32" pathLength={1} />
        <path d={dentils.map((x) => `M${x} 22.5 V25`).join(' ')} pathLength={1} opacity=".7" />
        {pillars.map((x) => (
          <path
            key={x}
            d={`M${x - 5} 32 H${x + 5} M${x - 3.6} 33.5 V79 M${x + 3.6} 33.5 V79 M${x - 1.6} 37 V75 M${x + 1.6} 37 V75 M${x - 5.2} 79 H${x + 5.2} V86 H${x - 5.2} Z`}
            pathLength={1}
          />
        ))}
        {/* The crystal lantern hanging from the porch ceiling */}
        <path d="M120 32 V38 M117.5 38 h5 l1 2.5 h-7 Z M116.5 40.5 l1.2 5.5 h4.6 l1.2 -5.5 M120 40.5 V46 M118.2 46 l1.8 2.4 l1.8 -2.4" pathLength={1} />
        {/* Fountain: basin, tiered bowl and statue, falling water */}
        <path d="M95 98 C 95 92.5, 145 92.5, 145 98 C 145 103.5, 95 103.5, 95 98 Z" pathLength={1} />
        <path d="M99 97 C 99 94.5, 141 94.5, 141 97" pathLength={1} opacity=".6" />
        <path d="M116 96 C 116 91, 117.5 87, 118 82.5 H122 C 122.5 87, 124 91, 124 96 M118 88 C 119 86.5, 121 86.5, 122 88" pathLength={1} />
        <path d="M105 76 Q 110 83 120 83 Q 130 83 135 76 Q 127.5 78.5 120 78 Q 112.5 78.5 105 76 Z" pathLength={1} />
        <path d="M120 78 V71.5 M117 71.5 h6 M120 71.5 V68" pathLength={1} />
        <path d="M105.5 77 C 102 82, 101 88, 101 95 M134.5 77 C 138 82, 139 88, 139 95" pathLength={1} opacity=".5" strokeDasharray="1.2 2.2" />
        {/* Ground line and the round brick court opening towards us */}
        <path d="M4 86 H94 M146 86 H236" pathLength={1} opacity=".7" />
        <path d="M70 92 C 76 104, 164 104, 170 92 M86 103 L78 112 M154 103 L162 112" pathLength={1} opacity=".55" />
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

            <div className="mx-auto mb-4 flex w-[86%] max-w-[230px] justify-center sm:mb-5">
              <Estate />
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
