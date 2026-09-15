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
 *  `xlsx` (~400kB) so it only loads when someone actually exports. */
export async function downloadSeatingExcel(tables: Table[], unassigned: Guest[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.aoa_to_sheet(buildSummarySheetRows(tables, unassigned));
  summaryWs['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  const detailWs = XLSX.utils.aoa_to_sheet(buildDetailSheetRows(tables, unassigned));
  detailWs['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, detailWs, 'Table Assignments');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `seating-chart-${date}.xlsx`);
}
