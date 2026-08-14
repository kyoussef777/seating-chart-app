import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not defined');
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}

// Connect on first query, not on import: `next build` imports every route module
// to collect page data, and a build machine has no DATABASE_URL.
export const db = new Proxy({} as Db, {
  get: (_target, prop) => {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
