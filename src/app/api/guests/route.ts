import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { guests, tables, eventSettings } from '@/lib/schema';
import { eq, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    // Check if the request is authenticated
    const session = await getSession();
    const isAuthenticated = session !== null;

    // If not authenticated, check if search is enabled
    if (!isAuthenticated) {
      const [settings] = await db.select().from(eventSettings).limit(1);
      if (settings && !settings.searchEnabled) {
        return NextResponse.json(
          { error: 'Guest search is currently disabled' },
          { status: 403 }
        );
      }
    }

    let guestList;
    if (search) {
      // Sanitize search input to prevent potential issues
      const sanitizedSearch = search.trim().slice(0, 100);
      guestList = await db
        .select()
        .from(guests)
        .where(ilike(guests.name, `%${sanitizedSearch}%`));
    } else {
      guestList = await db.select().from(guests);
    }

    // If not authenticated, return only non-sensitive information
    if (!isAuthenticated) {
      const publicGuestList = guestList.map(guest => ({
        id: guest.id,
        name: guest.name,
        tableId: guest.tableId,
        partySize: guest.partySize,
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

    // Validate and sanitize inputs
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const sanitizedName = name.trim().slice(0, 255);
    if (!sanitizedName) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    const [guest] = await db.insert(guests).values({
      name: sanitizedName,
      phoneNumber: phoneNumber ? String(phoneNumber).trim().slice(0, 20) : null,
      address: address ? String(address).trim().slice(0, 500) : null,
      tableId: tableId || null,
      partySize: Math.max(1, Math.min(20, parseInt(partySize) || 1)),
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

    // SECURITY: Always require auth for updates, except for guest self-service address updates
    if (requiresAuth) {
      await requireAuth();
    } else {
      // For guest self-service, only allow address updates (no name, table, party size changes)
      if (name !== undefined || tableId !== undefined || partySize !== undefined) {
        return NextResponse.json(
          { error: 'Unauthorized: Only address updates are allowed without authentication' },
          { status: 403 }
        );
      }
    }

    if (!id || typeof id !== 'string') {
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

    // Sanitize and validate inputs
    if (name !== undefined) {
      const sanitizedName = String(name).trim().slice(0, 255);
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber ? String(phoneNumber).trim().slice(0, 20) : null;
    }
    if (address !== undefined) {
      updateData.address = address ? String(address).trim().slice(0, 500) : null;
    }
    if (tableId !== undefined) updateData.tableId = tableId;
    if (partySize !== undefined) {
      updateData.partySize = Math.max(1, Math.min(20, parseInt(partySize) || 1));
    }

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