'use client';

import Image from 'next/image';
import { EVENT_TEMPLATES } from '@/lib/templates';
import type { GuestPortal } from '@/hooks/useGuestPortal';
import {
  PortalAddressPanel,
  PortalHeader,
  PortalResultPanel,
  PortalSearchPanel,
} from '@/components/guest/PortalPanels';

/**
 * The original engagement look: the couple's photograph behind a beige veil,
 * with the card floating over it. Restored from the pre-garden home page.
 */

const template = EVENT_TEMPLATES.engagement;
const { palette } = template;

export default function EngagementTemplate({ portal }: { portal: GuestPortal }) {
  return (
    <div className="relative min-h-screen" style={{ background: palette.pageBackground }}>
      {/* Photograph backdrop */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/6T2A7308.jpg"
          alt=""
          fill
          priority
          quality={75}
          sizes="100vw"
          className="object-cover object-top sm:object-[center_30%]"
        />
        {/* Beige veil so the card copy stays legible over any crop. */}
        <div className="absolute inset-0 bg-stone-100/75" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[560px] px-4 pt-[4vh] pb-12 sm:pt-[6vh]">
        <div
          className="garden-enter relative px-6 pt-9 pb-8 sm:px-10 sm:pt-11 sm:pb-9"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.surfaceBorder}`,
            borderRadius: template.shape.panel,
            boxShadow: palette.surfaceShadow,
            backdropFilter: 'blur(2px)',
          }}
        >
          <PortalHeader template={template} portal={portal} />
          <PortalSearchPanel template={template} portal={portal} />
        </div>

        <PortalResultPanel template={template} portal={portal} />
        <PortalAddressPanel template={template} portal={portal} />
      </div>
    </div>
  );
}
