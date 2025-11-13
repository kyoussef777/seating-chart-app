import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eventSettings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const [settings] = await db.select().from(eventSettings).limit(1);

    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(eventSettings).values({
        eventName: 'Our Special Day',
        homePageText: 'Welcome to our wedding! Please find your table below.',
      }).returning();

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
    const { eventName, homePageText, searchEnabled } = await request.json();

    if (eventName === undefined && homePageText === undefined && searchEnabled === undefined) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 400 }
      );
    }

    // Get existing settings
    const [existingSettings] = await db.select().from(eventSettings).limit(1);

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      const updateData: {
        eventName?: string;
        homePageText?: string;
        searchEnabled?: boolean;
        updatedAt: Date;
      } = { updatedAt: new Date() };
      if (eventName !== undefined) updateData.eventName = eventName;
      if (homePageText !== undefined) updateData.homePageText = homePageText;
      if (searchEnabled !== undefined) updateData.searchEnabled = searchEnabled;

      [updatedSettings] = await db
        .update(eventSettings)
        .set(updateData)
        .where(eq(eventSettings.id, existingSettings.id))
        .returning();
    } else {
      // Create new settings
      [updatedSettings] = await db.insert(eventSettings).values({
        eventName: eventName || 'Our Special Day',
        homePageText: homePageText || 'Welcome to our wedding! Please find your table below.',
        searchEnabled: searchEnabled !== undefined ? searchEnabled : true,
      }).returning();
    }

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