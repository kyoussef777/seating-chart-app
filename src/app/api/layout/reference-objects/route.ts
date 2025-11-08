import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { referenceObjects } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET all reference objects
export async function GET() {
  try {
    const allObjects = await db.select().from(referenceObjects);
    return NextResponse.json(allObjects);
  } catch (error) {
    console.error('Error fetching reference objects:', error);
    return NextResponse.json({ error: 'Failed to fetch reference objects' }, { status: 500 });
  }
}

// POST create/update reference objects (bulk operation)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referenceObjects: objectData } = body;

    if (!Array.isArray(objectData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Delete all existing reference objects and insert new ones
    await db.delete(referenceObjects);

    if (objectData.length > 0) {
      // Let database generate UUIDs, ignore frontend IDs
      await db.insert(referenceObjects).values(
        objectData.map((obj) => ({
          type: obj.type,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving reference objects:', error);
    return NextResponse.json({ error: 'Failed to save reference objects' }, { status: 500 });
  }
}

// DELETE a specific reference object
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reference object ID required' }, { status: 400 });
    }

    await db.delete(referenceObjects).where(eq(referenceObjects.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reference object:', error);
    return NextResponse.json({ error: 'Failed to delete reference object' }, { status: 500 });
  }
}
