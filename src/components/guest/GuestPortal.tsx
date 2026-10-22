'use client';

import { useGuestPortal } from '@/hooks/useGuestPortal';
import { resolveTemplate } from '@/lib/templates';
import type { PortalSettings } from '@/lib/event-settings';
import BridalShowerTemplate from '@/components/guest/templates/BridalShowerTemplate';
import WeddingTemplate from '@/components/guest/templates/WeddingTemplate';
import EngagementTemplate from '@/components/guest/templates/EngagementTemplate';

/**
 * The guest portal: one behaviour, rendered by whichever template the event is
 * configured for. Adding an event type means adding a template component and
 * an entry in `lib/templates.ts` — nothing here changes shape.
 */
export default function GuestPortal({
  initialSettings,
}: {
  /** Settings rendered on the server; null when the database was unreachable. */
  initialSettings: PortalSettings | null;
}) {
  const portal = useGuestPortal(initialSettings);
  const canvas = resolveTemplate(portal.settings.template).palette.canvas;

  return (
    <>
      {/* Paint the page edges in the template's colour. The body is
          near-black in dark mode and showed through wherever the portal did
          not reach: the rubber-band at either end, and behind the keyboard
          while typing a name. A server-rendered style, so there is no dark
          flash before hydration, and it leaves with the portal. */}
      <style>{`html,body{background-color:${canvas}}`}</style>
      {renderTemplate(portal)}
    </>
  );
}

function renderTemplate(portal: ReturnType<typeof useGuestPortal>) {
  switch (portal.settings.template) {
    case 'wedding':
      return <WeddingTemplate portal={portal} />;
    case 'engagement':
      return <EngagementTemplate portal={portal} />;
    case 'bridal-shower':
    default:
      return <BridalShowerTemplate portal={portal} />;
  }
}
