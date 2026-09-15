import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tables, guests } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import {
  TABLE_CAPACITY_MAX,
  TABLE_CAPACITY_MIN,
  TABLE_COLORS,
  TABLE_MAX_SIZE,
  TABLE_MIN_SIZE,
  isTableShape,
} from '@/lib/seating';

/** A size override, or null to go back to the shape's default footprint. */
function normalizeSize(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return null;
  return Math.min(TABLE_MAX_SIZE, Math.max(TABLE_MIN_SIZE, size));
}

/** An accent colour key, or null for the theme default. Unknown keys are
 *  dropped rather than stored, so the palette stays the only source of truth. */
function normalizeColor(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return typeof value === 'string' && TABLE_COLORS[value] ? value : null;
}

function normalizeCapacity(value: unknown): number {
  return Math.max(TABLE_CAPACITY_MIN, Math.min(TABLE_CAPACITY_MAX, parseInt(String(value), 10) || 8));
}

function normalizeCoordinate(value: unknown): number {
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : 0;
}

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
    const { name, shape, capacity, positionX, positionY, rotation, width, height, color } =
      await request.json();

    // Validate and sanitize inputs
    if (!name || typeof name !== 'string' || !shape || !capacity) {
      return NextResponse.json(
        { error: 'Name, shape, and capacity are required' },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim().slice(0, 50);
    // Every shape the picker offers is accepted. This list used to be just
    // round and rectangular, so choosing square, oval, U-shape or cocktail
    // silently created a round table instead.
    const sanitizedShape = isTableShape(shape) ? shape : 'round';

    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Table name cannot be empty' },
        { status: 400 }
      );
    }

    const [table] = await db.insert(tables).values({
      name: sanitizedName,
      shape: sanitizedShape,
      capacity: normalizeCapacity(capacity),
      positionX: normalizeCoordinate(positionX),
      positionY: normalizeCoordinate(positionY),
      rotation: normalizeCoordinate(rotation),
      width: normalizeSize(width) ?? null,
      height: normalizeSize(height) ?? null,
      color: normalizeColor(color) ?? null,
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
    const { id, name, shape, capacity, positionX, positionY, rotation, width, height, color } =
      await request.json();

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
      width?: number | null;
      height?: number | null;
      color?: string | null;
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
      if (!isTableShape(shape)) {
        return NextResponse.json({ error: 'Unknown table shape' }, { status: 400 });
      }
      updateData.shape = shape;
    }
    if (capacity !== undefined) updateData.capacity = normalizeCapacity(capacity);
    if (positionX !== undefined) updateData.positionX = normalizeCoordinate(positionX);
    if (positionY !== undefined) updateData.positionY = normalizeCoordinate(positionY);
    if (rotation !== undefined) updateData.rotation = normalizeCoordinate(rotation);

    const nextWidth = normalizeSize(width);
    if (nextWidth !== undefined) updateData.width = nextWidth;
    const nextHeight = normalizeSize(height);
    if (nextHeight !== undefined) updateData.height = nextHeight;
    const nextColor = normalizeColor(color);
    if (nextColor !== undefined) updateData.color = nextColor;

    // Drizzle rejects an empty SET, so a payload of nothing but an id reads
    // the table back rather than 500ing.
    if (Object.keys(updateData).length === 0) {
      const [existing] = await db.select().from(tables).where(eq(tables.id, id));
      if (!existing) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }
      const existingGuests = await db.select().from(guests).where(eq(guests.tableId, id));
      return NextResponse.json({ table: { ...existing, guests: existingGuests } });
    }

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
