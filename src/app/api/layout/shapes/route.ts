import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shapes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

// GET all shapes
export async function GET() {
  try {
    const allShapes = await db.select().from(shapes);
    return NextResponse.json(allShapes);
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return NextResponse.json({ error: 'Failed to fetch shapes' }, { status: 500 });
  }
}

// POST create/update shapes (bulk operation)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shapes: shapeData } = body;

    if (!Array.isArray(shapeData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Delete all existing shapes and insert new ones
    await db.delete(shapes);

    if (shapeData.length > 0) {
      // Let database generate UUIDs, ignore frontend IDs
      await db.insert(shapes).values(
        shapeData.map((shape) => ({
          type: shape.type,
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          rotation: shape.rotation,
          color: shape.color,
          label: shape.label || null,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving shapes:', error);
    return NextResponse.json({ error: 'Failed to save shapes' }, { status: 500 });
  }
}

// DELETE a specific shape
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shape ID required' }, { status: 400 });
    }

    await db.delete(shapes).where(eq(shapes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shape:', error);
    return NextResponse.json({ error: 'Failed to delete shape' }, { status: 500 });
  }
}
