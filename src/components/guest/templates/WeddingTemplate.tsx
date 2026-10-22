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
 * The estate seen from the brick drive: a long white house under a hipped
 * roof, two chimneys, lower wings either side, black shutters on every window
 * and the two-storey columned portico at the centre, flat-topped with a
 * balustrade — a country house, not a temple front. Hedges line the facade
 * and the drive opens towards the viewer.
 */
function Estate() {
  const columns = [100, 113, 127, 140];
  // [centre x, top, height] for each window, both storeys of every block.
  const windows: [number, number, number][] = [
    [82, 40, 11], [158, 40, 11], [82, 62, 13], [158, 62, 13],
    [32, 51, 9], [52, 51, 9], [188, 51, 9], [208, 51, 9],
    [32, 66, 11], [52, 66, 11], [188, 66, 11], [208, 66, 11],
  ];
  const hedges = [30, 44, 58, 182, 196, 210];
  const balusters = Array.from({ length: 12 }, (_, i) => 97 + i * 4.2);

  return (
    <svg className="wed-crest" viewBox="0 0 240 100" aria-hidden width="100%" style={{ maxWidth: 210 }}>
      <g fill="none" stroke={palette.accent} strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round">
        {/* Roofs and chimneys */}
        <path d="M62 30 L88 14 H152 L178 30 Z" pathLength={1} />
        <path d="M97 15 V7 H103 V15 M137 15 V7 H143 V15" pathLength={1} />
        <path d="M14 44 L28 36 H70 M226 44 L212 36 H170 M14 44 H70 M170 44 H226" pathLength={1} />
        {/* Walls */}
        <path d="M70 30 V84 M170 30 V84 M18 44 V84 M222 44 V84" pathLength={1} />
        {/* Windows, each with its pair of black shutters */}
        {windows.map(([x, top, h]) => (
          <g key={`${x}-${top}`}>
            <path d={`M${x - 3} ${top} h6 v${h} h-6 Z M${x} ${top} v${h}`} pathLength={1} />
            <rect
              className="wed-crest-fill"
              x={x - 5.6}
              y={top}
              width="2.1"
              height={h}
              fill={palette.heading}
              stroke="none"
              fillOpacity=".72"
            />
            <rect
              className="wed-crest-fill"
              x={x + 3.5}
              y={top}
              width="2.1"
              height={h}
              fill={palette.heading}
              stroke="none"
              fillOpacity=".72"
            />
          </g>
        ))}
        {/* Portico: balustrade, entablature and four two-storey columns */}
        <path d="M93 24.5 H147 M93 30.5 H147" pathLength={1} />
        <path d={balusters.map((x) => `M${x} 25 V30`).join(' ')} pathLength={1} opacity=".8" />
        <path d="M91 31 H149 V35.5 H91 Z" pathLength={1} />
        {columns.map((x) => (
          <path
            key={x}
            d={`M${x - 3.2} 36.5 H${x + 3.2} M${x - 1.5} 36.5 V82 M${x + 1.5} 36.5 V82 M${x - 2.8} 82 H${x + 2.8}`}
            pathLength={1}
          />
        ))}
        {/* Upper window and the fanlit front door between the centre columns */}
        <path d="M116.5 43 h7 v10 h-7 Z" pathLength={1} />
        <path d="M115.5 84 V69 A4.5 4.5 0 0 1 124.5 69 V84 M120 64.5 V69" pathLength={1} />
        {/* Steps, ground and the brick drive opening towards us */}
        <path d="M107 84 H133 M103 87 H137" pathLength={1} />
        <path d="M6 84 H234" pathLength={1} opacity=".7" />
        <path d="M107 88 C 98 93, 80 97, 58 99.5 M133 88 C 142 93, 160 97, 182 99.5" pathLength={1} opacity=".6" />
      </g>
      {/* Clipped boxwood along the front garden */}
      <g className="wed-crest-fill" fill={palette.dividerLeaf} fillOpacity=".75">
        {hedges.map((x) => (
          <ellipse key={x} cx={x} cy="81" rx="6" ry="3.6" />
        ))}
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

            <div className="mx-auto mb-4 flex w-[78%] max-w-[210px] justify-center sm:mb-5">
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
