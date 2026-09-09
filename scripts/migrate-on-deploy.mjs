/**
 * Apply pending Drizzle migrations, then let the build continue.
 *
 * Vercel has no release phase, so the build command is the only hook that runs
 * once per deployment with the database reachable. Wiring migrations in here
 * keeps schema and code shipping together: #4 added columns to event_settings,
 * the migration was never run by hand, and every route that reads settings
 * returned 500 until it was.
 *
 * A failed migration fails the build on purpose — better a deploy that does not
 * land than one serving code against a schema that cannot answer it.
 *
 * Skips (exit 0, build proceeds) when:
 *   - DATABASE_URL is unset, so `next build` still works on a machine or CI
 *     runner without secrets, as it did before.
 *   - SKIP_DB_MIGRATE=1, the escape hatch for a deploy that must not touch the
 *     database.
 */

import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

// Real environment variables win: dotenv does not override what is already set,
// so Vercel's project settings take precedence over any local file.
config({ path: ['.env.local', '.env'], quiet: true });

const label = process.env.VERCEL_ENV ? `vercel:${process.env.VERCEL_ENV}` : 'local';

if (process.env.SKIP_DB_MIGRATE === '1') {
  console.log(`[migrate] SKIP_DB_MIGRATE=1 — skipping migrations (${label}).`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log(
    `[migrate] DATABASE_URL is not set — skipping migrations (${label}). ` +
      'Set it in Vercel for both Production and Preview so deploys migrate themselves.'
  );
  process.exit(0);
}

console.log(`[migrate] Applying pending migrations (${label})...`);

// `pg` is a devDependency purely so drizzle-kit picks the plain TCP driver here.
// Without it drizzle-kit falls back to @neondatabase/serverless over websockets,
// which only reaches hosted Neon — the same command would then be untestable
// against any other Postgres.
const result = spawnSync('npx', ['--no-install', 'drizzle-kit', 'migrate'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('[migrate] Could not run drizzle-kit:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    '[migrate] Migrations failed — stopping the build so the old schema keeps ' +
      'serving the old code. Fix the migration, or set SKIP_DB_MIGRATE=1 to ' +
      'deploy without touching the database.'
  );
  process.exit(result.status ?? 1);
}

console.log('[migrate] Database is up to date.');
