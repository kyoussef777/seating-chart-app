import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { labels } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET all labels
export async function GET() {
  try {
    const allLabels = await db.select().from(labels);
    return NextResponse.json(allLabels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

// POST create/update labels (bulk operation)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { labels: labelData } = body;

    if (!Array.isArray(labelData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Delete all existing labels and insert new ones
    await db.delete(labels);

    if (labelData.length > 0) {
      // Let database generate UUIDs, ignore frontend IDs
      await db.insert(labels).values(
        labelData.map((label) => ({
          text: label.text,
          x: label.x,
          y: label.y,
          fontSize: label.fontSize,
          rotation: label.rotation,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving labels:', error);
    return NextResponse.json({ error: 'Failed to save labels' }, { status: 500 });
  }
}

// DELETE a specific label
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Label ID required' }, { status: 400 });
    }

    await db.delete(labels).where(eq(labels.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting label:', error);
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}
