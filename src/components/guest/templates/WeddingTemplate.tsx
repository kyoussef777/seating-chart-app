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
 * Ivory and gold: a plain stationery card inside a double gold rule, with a
 * drawn laurel instead of a photograph. Deliberately image-free so it works for
 * any couple without art direction.
 *
 * The whole exchange — name, search, table, address — stays on the one card,
 * so the answer appears where the guest is already looking. Motion lives in
 * globals.css under `.wedding-portal`: the frame settles, the laurels draw
 * themselves, the copy rises line by line down to the search box, and the
 * table is revealed the same way. All of it is off under reduced motion.
 */

const template = EVENT_TEMPLATES.wedding;
const { palette } = template;

/** A single sprig, mirrored to make the corner flourishes. */
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className="wed-laurel"
      width="70"
      height="70"
      viewBox="0 0 86 86"
      aria-hidden
      style={{ transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.6 }}
    >
      <g fill="none" stroke={palette.accent} strokeWidth="1.1" strokeLinecap="round">
        <path d="M10 76 C 26 62, 40 42, 46 14" pathLength={1} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t = i / 5;
          const x = 10 + (46 - 10) * (0.15 + t * 0.85);
          const y = 76 - (76 - 14) * (0.15 + t * 0.85);
          return (
            <g
              key={i}
              transform={`translate(${x} ${y}) rotate(${-32 - i * 6})`}
              style={{ ['--i' as string]: i }}
            >
              <ellipse cx="9" cy="0" rx="9" ry="3.6" pathLength={1} />
              <ellipse cx="-9" cy="0" rx="9" ry="3.6" pathLength={1} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function WeddingTemplate({ portal }: { portal: GuestPortal }) {
  return (
    <div
      className="wedding-portal relative min-h-[100svh] overflow-clip"
      style={{ background: palette.pageBackground }}
    >
      {/* Paper grain: two very soft pools rather than a texture image, drifting
          slowly enough to read as light rather than movement. */}
      <div
        className="wed-glow pointer-events-none absolute -inset-[10%]"
        style={{
          background:
            'radial-gradient(42% 30% at 12% 8%,rgba(255,255,255,.9),transparent 70%),radial-gradient(46% 32% at 88% 94%,rgba(226,212,182,.45),transparent 72%)',
        }}
      />

      <main className="relative mx-auto flex min-h-[100svh] w-full max-w-[560px] flex-col justify-center px-[22px] py-10 sm:px-4 sm:py-16">
        <div className="relative">
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
            className="wed-card relative px-5 pt-9 pb-8 sm:px-12 sm:pt-11 sm:pb-10"
            style={{ background: palette.surface, boxShadow: palette.surfaceShadow }}
          >
            <div className="pointer-events-none absolute left-3 top-3 hidden sm:block">
              <Laurel />
            </div>
            <div className="pointer-events-none absolute right-3 top-3 hidden sm:block">
              <Laurel flip />
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
