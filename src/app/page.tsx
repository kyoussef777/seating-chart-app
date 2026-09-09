import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { eventSettings } from '@/lib/schema';
import { toPortalSettings, type PortalSettings } from '@/lib/event-settings';
import GuestPortal from '@/components/guest/GuestPortal';

// Event copy is edited in the admin panel and must be live for guests, so this
// page is rendered per request rather than baked at build time.
export const dynamic = 'force-dynamic';

/**
 * Read the settings row directly. Returns null when the database is
 * unreachable (or unconfigured, as on a build machine) so the portal can fall
 * back to fetching /api/settings from the browser.
 */
async function loadSettings(): Promise<PortalSettings | null> {
  try {
    const [row] = await db.select().from(eventSettings).limit(1);
    return toPortalSettings(row ?? null);
  } catch (error) {
    console.error('Home page settings load failed:', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  if (!settings) return {};

  const description = `Find your table assignment for ${settings.eventName}`;
  return {
    title: settings.eventName,
    description,
    openGraph: {
      title: settings.eventName,
      description,
      images: ['/logo.png'],
    },
  };
}

export default async function HomePage() {
  const settings = await loadSettings();
  return <GuestPortal initialSettings={settings} />;
}
