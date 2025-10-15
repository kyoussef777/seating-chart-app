import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests, tables } from '@/lib/schema';
import { eq, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    // Check if the request is authenticated
    const session = await getSession();
    const isAuthenticated = session !== null;

    let guestList;
    if (search) {
      guestList = await db
        .select()
        .from(guests)
        .where(ilike(guests.name, `%${search}%`));
    } else {
      guestList = await db.select().from(guests);
    }

    // If not authenticated, return only non-sensitive information
    if (!isAuthenticated) {
      const publicGuestList = guestList.map(guest => ({
        id: guest.id,
        name: guest.name,
        tableId: guest.tableId,
        // Exclude phoneNumber, address, and other PII
      }));
      return NextResponse.json({ guests: publicGuestList });
    }

    // If authenticated (admin), return full guest information
    return NextResponse.json({ guests: guestList });
  } catch (error) {
    console.error('Get guests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { name, phoneNumber, address, tableId, partySize } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const [guest] = await db.insert(guests).values({
      name,
      phoneNumber: phoneNumber || null,
      address: address || null,
      tableId: tableId || null,
      partySize: partySize || 1,
    }).returning();

    return NextResponse.json({ guest });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create guest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, phoneNumber, address, tableId, partySize, requiresAuth = true } = await request.json();

    if (requiresAuth) {
      await requireAuth();
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      );
    }

    // Get the current guest to check their current table and party size
    const [currentGuest] = await db.select().from(guests).where(eq(guests.id, id));

    if (!currentGuest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    // If assigning to a table (not unassigning), validate capacity
    if (tableId !== undefined && tableId !== null) {
      // Get the table
      const [table] = await db.select().from(tables).where(eq(tables.id, tableId));

      if (!table) {
        return NextResponse.json(
          { error: 'Table not found' },
          { status: 404 }
        );
      }

      // Get all guests currently assigned to this table (excluding the current guest if they're already at this table)
      const tableGuests = await db
        .select()
        .from(guests)
        .where(eq(guests.tableId, tableId));

      // Calculate current seats used (excluding this guest if they're already assigned to this table)
      const currentSeatsUsed = tableGuests
        .filter(g => g.id !== id)
        .reduce((total, g) => total + (g.partySize || 1), 0);

      // Get the party size (use new value if updating, otherwise use current)
      const guestPartySize = partySize !== undefined ? partySize : (currentGuest.partySize || 1);

      // Calculate total seats if we add this guest
      const totalSeatsNeeded = currentSeatsUsed + guestPartySize;

      // Check if there's enough capacity
      if (totalSeatsNeeded > table.capacity) {
        const availableSeats = table.capacity - currentSeatsUsed;
        return NextResponse.json(
          { error: `Not enough space at ${table.name}. This party needs ${guestPartySize} seat${guestPartySize > 1 ? 's' : ''} but only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available.` },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      phoneNumber?: string | null;
      address?: string | null;
      tableId?: string | null;
      partySize?: number;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (tableId !== undefined) updateData.tableId = tableId;
    if (partySize !== undefined) updateData.partySize = partySize;

    const [updatedGuest] = await db
      .update(guests)
      .set(updateData)
      .where(eq(guests.id, id))
      .returning();

    if (!updatedGuest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ guest: updatedGuest });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update guest error:', error);
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
        { error: 'Guest ID is required' },
        { status: 400 }
      );
    }

    await db.delete(guests).where(eq(guests.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete guest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}