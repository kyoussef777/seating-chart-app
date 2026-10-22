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
 * The Park Savoy's front, laid out after the estate's illustrated print: the
 * two-storey main house under a low hipped roof, its columned portico capped
 * with a hipped roof of its own, tall piers where the house meets
 * the single-storey end wings, and lattice railings around the wings' roof
 * terraces. Black shutters throughout, the Juliet balcony and front door at
 * the centre and the tiered fountain before it. Kept to plain lines.
 *
 * Lit as it is on a wedding night: once the lines are drawn the windows warm
 * up one after another and the porch lantern glows.
 */
function Estate() {
  const columns = [88, 106, 134, 152];
  // [centre x, top, height] for each window of the main house and wings.
  const windows: [number, number, number][] = [
    [58, 45, 10], [74, 45, 10], [97, 45, 10], [143, 45, 10], [166, 45, 10], [182, 45, 10],
    [58, 62, 12], [74, 62, 12], [97, 62, 12], [143, 62, 12], [166, 62, 12], [182, 62, 12],
    [13, 66, 11], [29, 66, 11], [211, 66, 11], [227, 66, 11],
  ];
  const dentils = Array.from({ length: 19 }, (_, i) => 83 + i * 4.11);
  // The wings' roof terraces: posts, rails and a lattice band between them.
  const lattice = (x0: number, x1: number) => {
    const posts = Array.from({ length: Math.round((x1 - x0) / 9) + 1 }, (_, i) => x0 + ((x1 - x0) * i) / Math.round((x1 - x0) / 9));
    const cross = Array.from({ length: Math.floor((x1 - x0) / 3) }, (_, i) => {
      const x = x0 + i * 3;
      return `M${x} 55.5 l3 3 M${x + 3} 55.5 l-3 3`;
    });
    return `M${x0} 53.5 H${x1} M${x0} 59 H${x1} ${posts.map((x) => `M${x} 52 V59`).join(' ')} ${cross.join(' ')}`;
  };

  return (
    <svg className="wed-crest" viewBox="0 0 240 104" aria-hidden width="100%" style={{ maxWidth: 240 }}>
      <defs>
        <radialGradient id="wed-lantern-glow">
          <stop offset="0" stopColor="#F6DC8E" stopOpacity=".9" />
          <stop offset="1" stopColor="#F6DC8E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="wed-lantern" cx="120" cy="39" r="6" fill="url(#wed-lantern-glow)" />

      <g fill="none" stroke={palette.accent} strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round">
        {/* Main house: low hipped roof either side of the portico */}
        <path d="M46 40 L58 31 H84 M194 40 L182 31 H156 M46 40 H84 M156 40 H194 M50 40 V89 M190 40 V89" pathLength={1} />
        {/* End wings with their lattice-railed roof terraces */}
        <path d="M2 60 H44 M196 60 H238 M4 60 V89 M236 60 V89" pathLength={1} />
        <path d={`${lattice(4, 40)} ${lattice(200, 236)}`} pathLength={1} opacity=".75" strokeWidth=".6" />
        {/* Piers where the wings meet the house */}
        <path d="M40 51 H50 V89 H40 Z M190 51 H200 V89 H190 Z" pathLength={1} />
        {/* Windows, each with its pair of black shutters; hoods on the lower row */}
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
              d={`M${x - 3} ${top} h6 v${h} h-6 Z M${x - 3} ${top + h / 2} h6 M${x} ${top} v${h}${top > 55 ? ` M${x - 4.6} ${top - 2} h9.2` : ''}`}
              pathLength={1}
            />
            <rect className="wed-crest-fill" x={x - 5.6} y={top} width="2.1" height={h} fill={palette.heading} stroke="none" fillOpacity=".75" />
            <rect className="wed-crest-fill" x={x + 3.5} y={top} width="2.1" height={h} fill={palette.heading} stroke="none" fillOpacity=".75" />
          </g>
        ))}
        {/* Portico: its own low hipped roof, dentil cornice and four columns */}
        <path d="M80 24 L90 17 H150 L160 24" pathLength={1} />
        <path d="M78 24 H162 M80 27 H160 M81 34 H159 M81 27 V34 M159 27 V34" pathLength={1} />
        <path d={dentils.map((x) => `M${x} 27 V29`).join(' ')} pathLength={1} opacity=".7" />
        {columns.map((x) => (
          <path
            key={x}
            d={`M${x - 4} 34 H${x + 4} M${x - 2.8} 35.5 V82 M${x + 2.8} 35.5 V82 M${x - 4.2} 82 H${x + 4.2} V86 H${x - 4.2} Z`}
            pathLength={1}
          />
        ))}
        {/* Centre bay: French door and Juliet balcony, front door and lamps */}
        <rect
          className="wed-window"
          x="115"
          y="45"
          width="10"
          height="12"
          fill="#F2D48A"
          fillOpacity=".42"
          stroke="none"
          style={{ ['--i' as string]: windows.length }}
        />
        <path d="M115 45 h10 v12 h-10 Z M120 45 v12" pathLength={1} />
        <path d={`M112 57.5 H128 M112 52.5 H128 ${[114, 117, 120, 123, 126].map((x) => `M${x} 52.5 V57.5`).join(' ')}`} pathLength={1} />
        <path d="M112.5 64 H127.5 M114 64 V86 M126 64 V86 M116.5 66 h7 V86 h-7 Z" pathLength={1} />
        <path d="M110 68 v3.2 M130 68 v3.2" pathLength={1} strokeWidth="1.6" />
        {/* The crystal lantern hanging from the porch ceiling */}
        <path d="M120 34 V35.5 M118 35.5 h4 l.8 2 h-5.6 Z M117.2 37.5 l1 3.6 h3.6 l1 -3.6 M120 37.5 V41.1 M118.6 41.1 l1.4 1.6 l1.4 -1.6" pathLength={1} />
        {/* Fountain before the door: basin, tiered bowl and statue */}
        <path d="M104 92 C 104 88.5, 136 88.5, 136 92 C 136 95.5, 104 95.5, 104 92 Z" pathLength={1} />
        <path d="M117.5 91 C 117.5 87, 118.5 84, 118.6 80.5 H121.4 C 121.5 84, 122.5 87, 122.5 91" pathLength={1} />
        <path d="M111 76 Q 114 81 120 81 Q 126 81 129 76 Q 124.5 77.8 120 77.5 Q 115.5 77.8 111 76 Z M120 77.5 V72.5 M118 72.5 h4" pathLength={1} />
        <path d="M111.5 77 C 109.5 81, 108.5 85, 108.5 89.5 M128.5 77 C 130.5 81, 131.5 85, 131.5 89.5" pathLength={1} opacity=".5" strokeDasharray="1.2 2.2" />
        {/* The rise of lawn the house sits on */}
        <path d="M0 89 H104 M136 89 H240" pathLength={1} opacity=".7" />
        <path d="M14 95 C 60 91.5, 180 91.5, 226 95 M34 101 C 80 98, 160 98, 206 101" pathLength={1} opacity=".45" />
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

            <div className="mx-auto mb-4 flex w-[92%] max-w-[240px] justify-center sm:mb-5">
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
