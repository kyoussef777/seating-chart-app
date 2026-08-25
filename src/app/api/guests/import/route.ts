import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests } from '@/lib/schema';
import { parseGuestCsv } from '@/lib/guest-import';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const { guests: parsed, invalidRows, mapping } = parseGuestCsv(csvText);

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid guests found. The file needs a name column (either "Name" or "First Name" + "Last Name").',
          invalidRows,
          mapping,
        },
        { status: 400 }
      );
    }

    const validGuests = parsed;

    const insertedGuests = await db.insert(guests).values(validGuests).returning();

    return NextResponse.json({
      success: true,
      imported: insertedGuests.length,
      guests: insertedGuests,
      // Echo the detected column mapping so a mis-detected header is obvious
      // rather than silently producing 230 parties of one.
      mapping,
      invalidRows: invalidRows.length > 0 ? invalidRows : undefined
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Import guests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}