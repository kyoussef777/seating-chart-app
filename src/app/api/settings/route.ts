import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eventSettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { defaultPortalSettings, normalizeSettingsUpdate } from '@/lib/event-settings';
import { readEventSettingsRow } from '@/lib/event-settings-db';
import { isMissingColumnError } from '@/lib/db-errors';

/** Shown when the code has shipped but `npm run db:migrate` has not run. */
const MIGRATION_REQUIRED =
  'The database is missing the event template columns. Run `npm run db:migrate` ' +
  'against this environment, then save again.';

export async function GET() {
  try {
    const settings = await readEventSettingsRow();
    if (settings) return NextResponse.json({ settings });

    // First run: seed the row from the default template's copy.
    const [newSettings] = await db
      .insert(eventSettings)
      .values(defaultPortalSettings())
      .returning();

    return NextResponse.json({ settings: newSettings });
  } catch (error) {
    if (isMissingColumnError(error)) {
      // Nothing stored yet and nowhere to store it: serve the defaults so the
      // portal and the admin form still render.
      console.warn(`GET /api/settings: ${MIGRATION_REQUIRED}`);
      return NextResponse.json({ settings: defaultPortalSettings() });
    }
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();

    // Validation lives in lib/event-settings so the admin form and this route
    // cannot disagree about what a valid event looks like.
    const parsed = normalizeSettingsUpdate(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingSettings = await readEventSettingsRow();

    const [updatedSettings] = existingSettings
      ? await db
          .update(eventSettings)
          .set({ ...parsed.values, updatedAt: new Date() })
          .where(eq(eventSettings.id, existingSettings.id as string))
          .returning()
      : await db
          .insert(eventSettings)
          .values({ ...defaultPortalSettings(), ...parsed.values })
          .returning();

    return NextResponse.json({ settings: updatedSettings });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isMissingColumnError(error)) {
      // Say what is wrong rather than dropping the fields silently or 500ing.
      console.error(`PUT /api/settings: ${MIGRATION_REQUIRED}`);
      return NextResponse.json({ error: MIGRATION_REQUIRED }, { status: 503 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
