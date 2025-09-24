import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests } from '@/lib/schema';
import Papa from 'papaparse';

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

    const { data, errors } = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers to match our expected format
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('name')) return 'name';
        if (normalized.includes('phone') || normalized.includes('number')) return 'phoneNumber';
        if (normalized.includes('address')) return 'address';
        return header;
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: errors },
        { status: 400 }
      );
    }

    const validGuests = [];
    const invalidRows = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;

      if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
        invalidRows.push({ row: i + 1, error: 'Missing or invalid name' });
        continue;
      }

      validGuests.push({
        name: row.name.trim(),
        phoneNumber: row.phoneNumber ? String(row.phoneNumber).trim() : null,
        address: row.address ? String(row.address).trim() : null,
      });
    }

    if (validGuests.length === 0) {
      return NextResponse.json(
        { error: 'No valid guests found in CSV', invalidRows },
        { status: 400 }
      );
    }

    const insertedGuests = await db.insert(guests).values(validGuests).returning();

    return NextResponse.json({
      success: true,
      imported: insertedGuests.length,
      guests: insertedGuests,
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