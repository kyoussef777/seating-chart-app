import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env first.');
  process.exit(1);
}

// Usage: npm run create-admin [username] [password]
let [username, password] = process.argv.slice(2);

if (!username || !password) {
  const rl = createInterface({ input: stdin, output: stdout });
  username ||= await rl.question('Username: ');
  password ||= await rl.question('Password (visible): ');
  rl.close();
}

username = username.trim();

if (!username || password.length < 8) {
  console.error('Username is required and password must be at least 8 characters.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const hashed = await bcrypt.hash(password, 12);

// Same salt rounds as src/lib/auth.ts. Re-running updates the existing password.
const [user] = await sql`
  INSERT INTO users (username, password) VALUES (${username}, ${hashed})
  ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
  RETURNING id, username
`;

console.log(`Admin ready: ${user.username} (${user.id})`);
