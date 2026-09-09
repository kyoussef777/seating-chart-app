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
 */

const template = EVENT_TEMPLATES.wedding;
const { palette } = template;

/** A single sprig, mirrored to make the corner flourishes. */
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="70"
      height="70"
      viewBox="0 0 86 86"
      aria-hidden
      style={{ transform: flip ? 'scaleX(-1)' : undefined, opacity: 0.6 }}
    >
      <g fill="none" stroke={palette.accent} strokeWidth="1.1" strokeLinecap="round">
        <path d="M10 76 C 26 62, 40 42, 46 14" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const t = i / 5;
          const x = 10 + (46 - 10) * (0.15 + t * 0.85);
          const y = 76 - (76 - 14) * (0.15 + t * 0.85);
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${-32 - i * 6})`}>
              <ellipse cx="9" cy="0" rx="9" ry="3.6" />
              <ellipse cx="-9" cy="0" rx="9" ry="3.6" />
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
      className="relative min-h-screen overflow-hidden"
      style={{ background: palette.pageBackground }}
    >
      {/* Paper grain: two very soft pools rather than a texture image. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(42% 30% at 12% 8%,rgba(255,255,255,.9),transparent 70%),radial-gradient(46% 32% at 88% 94%,rgba(226,212,182,.45),transparent 72%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-4 py-10 sm:py-14">
        <div className="relative">
          {/* Double gold rule around the card */}
          <div
            className="pointer-events-none absolute"
            style={{ inset: '-14px', border: `1px solid ${palette.accent}` }}
          />
          <div
            className="pointer-events-none absolute"
            style={{ inset: '-7px', border: `1px solid ${palette.accent}66` }}
          />

          <div
            className="garden-enter relative px-6 pt-9 pb-8 sm:px-12 sm:pt-11 sm:pb-10"
            style={{ background: palette.surface, boxShadow: palette.surfaceShadow }}
          >
            <div className="pointer-events-none absolute left-3 top-3 hidden sm:block">
              <Laurel />
            </div>
            <div className="pointer-events-none absolute right-3 top-3 hidden sm:block">
              <Laurel flip />
            </div>

            <div className="relative">
              <PortalHeader template={template} portal={portal} />
              <PortalSearchPanel template={template} portal={portal} />
            </div>
          </div>
        </div>

        <PortalResultPanel template={template} portal={portal} />
        <PortalAddressPanel template={template} portal={portal} />
      </div>
    </div>
  );
}
