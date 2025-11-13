import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tables, guests } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allTables = await db.select().from(tables);
    const allGuests = await db.select().from(guests);

    const tablesWithGuests = allTables.map(table => ({
      ...table,
      guests: allGuests.filter(guest => guest.tableId === table.id)
    }));

    return NextResponse.json({ tables: tablesWithGuests });
  } catch (error) {
    console.error('Get tables error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { name, shape, capacity, positionX, positionY, rotation } = await request.json();

    // Validate and sanitize inputs
    if (!name || typeof name !== 'string' || !shape || !capacity) {
      return NextResponse.json(
        { error: 'Name, shape, and capacity are required' },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim().slice(0, 50);
    const sanitizedShape = ['round', 'rectangular'].includes(shape) ? shape : 'round';
    const validCapacity = Math.max(1, Math.min(50, parseInt(capacity) || 8));

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Table name cannot be empty' },
        { status: 400 }
      );
    }

    const [table] = await db.insert(tables).values({
      name: sanitizedName,
      shape: sanitizedShape,
      capacity: validCapacity,
      positionX: parseFloat(positionX) || 0,
      positionY: parseFloat(positionY) || 0,
      rotation: parseFloat(rotation) || 0,
    }).returning();

    return NextResponse.json({ table: { ...table, guests: [] } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create table error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const { id, name, shape, capacity, positionX, positionY, rotation } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    // Build update object with sanitized values
    const updateData: {
      name?: string;
      shape?: string;
      capacity?: number;
      positionX?: number;
      positionY?: number;
      rotation?: number;
    } = {};

    if (name !== undefined) {
      const sanitizedName = String(name).trim().slice(0, 50);
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'Table name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }
    if (shape !== undefined) {
      updateData.shape = ['round', 'rectangular'].includes(shape) ? shape : undefined;
    }
    if (capacity !== undefined) {
      updateData.capacity = Math.max(1, Math.min(50, parseInt(capacity) || 8));
    }
    if (positionX !== undefined) updateData.positionX = parseFloat(positionX) || 0;
    if (positionY !== undefined) updateData.positionY = parseFloat(positionY) || 0;
    if (rotation !== undefined) updateData.rotation = parseFloat(rotation) || 0;

    const [updatedTable] = await db
      .update(tables)
      .set(updateData)
      .where(eq(tables.id, id))
      .returning();

    if (!updatedTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const tableGuests = await db.select().from(guests).where(eq(guests.tableId, id));

    return NextResponse.json({ table: { ...updatedTable, guests: tableGuests } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update table error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    // Update guests to remove table assignment
    await db.update(guests).set({ tableId: null }).where(eq(guests.tableId, id));

    // Delete the table
    await db.delete(tables).where(eq(tables.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete table error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}