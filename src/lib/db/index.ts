/**
 * One database, two drivers.
 *
 * `DATABASE_URL` set   → postgres-js against Supabase Postgres. This is what
 *                        Vercel runs.
 * `DATABASE_URL` unset → PGlite, real Postgres compiled to WASM, stored in
 *                        `.pglite/`. Same SQL, same migrations, no credentials
 *                        needed to run the survey locally.
 *
 * Nothing else in the codebase knows which one is in use.
 */
import * as schema from './schema';

export type Db = Awaited<ReturnType<typeof create>>;

const LOCAL_DIR = process.env.PGLITE_DIR ?? '.pglite';

async function create() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    // Supabase's pooler does not support prepared statements.
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema });
  }

  const { drizzle } = await import('drizzle-orm/pglite');
  const { PGlite } = await import('@electric-sql/pglite');
  const client = new PGlite(LOCAL_DIR);
  return drizzle(client, { schema });
}

// Next.js dev reloads modules; keep one connection per process.
const globalForDb = globalThis as unknown as { __designallyDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__designallyDb ??= create();
  return globalForDb.__designallyDb;
}

export function usingLocalDatabase() {
  return !process.env.DATABASE_URL;
}

export { schema };
