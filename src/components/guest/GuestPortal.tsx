'use client';

import { useGuestPortal } from '@/hooks/useGuestPortal';
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
