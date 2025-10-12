import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

// Custom CSV parser to handle quoted values with commas
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
}

// Extract address from RSVP comment
function extractAddress(comment) {
  if (!comment || comment.trim() === '') return null;

  const text = comment.trim();

  // Pattern 1: Street address with ZIP (e.g., "123 Main St, City, ST 12345")
  const streetZipPattern = /\d+\s+[A-Za-z\s,.-]+\d{5}(-\d{4})?/;
  const streetZipMatch = text.match(streetZipPattern);
  if (streetZipMatch) return streetZipMatch[0].trim();

  // Pattern 2: Just ZIP code with state (e.g., "CA 94102")
  const stateZipPattern = /[A-Z]{2}\s+\d{5}(-\d{4})?/;
  const stateZipMatch = text.match(stateZipPattern);
  if (stateZipMatch) return stateZipMatch[0].trim();

  // Pattern 3: Just ZIP code (e.g., "12345")
  const zipPattern = /\d{5}(-\d{4})?/;
  const zipMatch = text.match(zipPattern);
  if (zipMatch) return zipMatch[0].trim();

  // If it looks like an address (has numbers and common address words), return it
  const addressWords = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 'ln', 'lane', 'blvd', 'boulevard', 'apt', 'suite', 'unit'];
  const lowerText = text.toLowerCase();
  const hasNumber = /\d/.test(text);
  const hasAddressWord = addressWords.some(word => lowerText.includes(word));

  if (hasNumber && hasAddressWord) {
    return text;
  }

  return null;
}

async function importGuests() {
  try {
    console.log('Starting guest import with party sizes...');

    // Delete all existing guests
    console.log('Deleting all existing guests...');
    await sql`DELETE FROM guests`;
    console.log('All guests deleted.');

    // Read CSV file
    const csvContent = fs.readFileSync('guestlist (3).csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Parse header to get column indices
    const header = parseCSVLine(lines[0]);
    const nameIndex = header.indexOf('Name');
    const phoneIndex = header.indexOf('Phone');
    const commentIndex = header.indexOf('RSVP Comment');
    const partyIndex = header.indexOf('Number In Party');

    console.log(`Found columns: Name (${nameIndex}), Phone (${phoneIndex}), RSVP Comment (${commentIndex}), Number In Party (${partyIndex})`);

    if (nameIndex === -1 || partyIndex === -1) {
      throw new Error('Required columns (Name, Number In Party) not found in CSV');
    }

    let imported = 0;
    let skipped = 0;

    // Process each guest (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      const name = values[nameIndex]?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      const phoneNumber = values[phoneIndex]?.trim() || null;
      const rawComment = values[commentIndex]?.trim() || '';
      const partySize = parseInt(values[partyIndex]?.trim()) || 1;
      const address = extractAddress(rawComment);

      try {
        await sql`
          INSERT INTO guests (name, phone_number, address, party_size, table_id, created_at, updated_at)
          VALUES (${name}, ${phoneNumber}, ${address}, ${partySize}, NULL, NOW(), NOW())
        `;
        imported++;
        console.log(`Imported: ${name} (Party size: ${partySize}${address ? ', Address: ' + address : ''})`);
      } catch (error) {
        console.error(`Error importing ${name}:`, error.message);
        skipped++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Total guests imported: ${imported}`);
    console.log(`Guests skipped: ${skipped}`);

    // Show summary stats
    const result = await sql`
      SELECT
        COUNT(*) as total_guests,
        SUM(party_size) as total_people,
        COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as guests_with_address
      FROM guests
    `;

    console.log(`\nDatabase Summary:`);
    console.log(`Total guest entries: ${result[0].total_guests}`);
    console.log(`Total people (sum of party sizes): ${result[0].total_people}`);
    console.log(`Guests with addresses: ${result[0].guests_with_address}`);

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importGuests();
