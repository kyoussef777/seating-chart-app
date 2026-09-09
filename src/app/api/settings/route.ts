import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eventSettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { defaultPortalSettings, normalizeSettingsUpdate } from '@/lib/event-settings';

export async function GET() {
  try {
    const [settings] = await db.select().from(eventSettings).limit(1);

    if (!settings) {
      // First run: seed the row from the default template's copy.
      const [newSettings] = await db
        .insert(eventSettings)
        .values(defaultPortalSettings())
        .returning();

      return NextResponse.json({ settings: newSettings });
    }

    return NextResponse.json({ settings });
  } catch (error) {
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

    const [existingSettings] = await db.select().from(eventSettings).limit(1);

    const [updatedSettings] = existingSettings
      ? await db
          .update(eventSettings)
          .set({ ...parsed.values, updatedAt: new Date() })
          .where(eq(eventSettings.id, existingSettings.id))
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
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
