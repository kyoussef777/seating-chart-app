/**
 * Excel export shared by the Seating Chart and Roster tabs, so the two views
 * cannot drift into different column layouts for the same underlying data.
 *
 * Two sheets: "Summary" is the venue/caterer-facing headcount-per-table view
 * (no guest contact info), "Table Assignments" is the detailed per-guest
 * listing the organiser uses internally.
 */

import { safeCell, seatsUsed, type Guest, type Table } from './seating.ts';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function buildSummarySheetRows(tables: Table[], unassigned: Guest[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['Table Name', 'Shape', 'Capacity', 'Seats Used', 'Seats Free', 'Guests Assigned'],
  ];

  const sortedTables = [...tables].sort(byName);
  let totalCapacity = 0;
  let totalUsed = 0;
  let totalGuestCount = 0;

  sortedTables.forEach((table) => {
    const used = seatsUsed(table.guests);
    totalCapacity += table.capacity;
    totalUsed += used;
    totalGuestCount += table.guests.length;
    rows.push([
      safeCell(table.name),
      safeCell(table.shape),
      table.capacity,
      used,
      table.capacity - used,
      table.guests.length,
    ]);
  });

  rows.push(['TOTAL', '', totalCapacity, totalUsed, totalCapacity - totalUsed, totalGuestCount]);

  if (unassigned.length > 0) {
    rows.push([]);
    rows.push(['Unassigned guests', '', '', '', '', unassigned.length]);
    rows.push(['Unassigned seats needed', '', '', '', '', seatsUsed(unassigned)]);
  }

  return rows;
}

export function buildDetailSheetRows(tables: Table[], unassigned: Guest[]): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['Table Name', 'Table Shape', 'Capacity', 'Seats Used', 'Guest Name', 'Party Size', 'Phone Number', 'Address'],
  ];

  const sortedTables = [...tables].sort(byName);

  sortedTables.forEach((table) => {
    const used = seatsUsed(table.guests);

    if (table.guests.length === 0) {
      rows.push([safeCell(table.name), safeCell(table.shape), table.capacity, 0, '(No guests assigned)', '', '', '']);
      return;
    }

    const sortedGuests = [...table.guests].sort(byName);
    sortedGuests.forEach((guest, index) => {
      rows.push([
        index === 0 ? safeCell(table.name) : '',
        index === 0 ? safeCell(table.shape) : '',
        index === 0 ? table.capacity : '',
        index === 0 ? used : '',
        safeCell(guest.name),
        guest.partySize || 1,
        safeCell(guest.phoneNumber),
        safeCell(guest.address),
      ]);
    });
  });

  if (unassigned.length > 0) {
    rows.push([]);
    rows.push(['UNASSIGNED GUESTS', '', '', '', '', '', '', '']);
    [...unassigned].sort(byName).forEach((guest) => {
      rows.push(['', '', '', '', safeCell(guest.name), guest.partySize || 1, safeCell(guest.phoneNumber), safeCell(guest.address)]);
    });
  }

  return rows;
}

/** Builds the workbook and triggers a browser download. Dynamically imports
 *  `write-excel-file` so it only loads when someone actually exports. It
 *  replaced `xlsx`, whose fixed releases are no longer published to npm; the
 *  export only ever writes, which is all this library does. */
export async function downloadSeatingExcel(tables: Table[], unassigned: Guest[]) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const width = (...chars: number[]) => chars.map((w) => ({ width: w }));

  const date = new Date().toISOString().split('T')[0];
  await writeExcelFile([
    {
      sheet: 'Summary',
      data: buildSummarySheetRows(tables, unassigned),
      columns: width(18, 12, 10, 11, 11, 16),
    },
    {
      sheet: 'Table Assignments',
      data: buildDetailSheetRows(tables, unassigned),
      columns: width(15, 12, 10, 12, 25, 12, 15, 30),
    },
  ]).toFile(`seating-chart-${date}.xlsx`);
}
