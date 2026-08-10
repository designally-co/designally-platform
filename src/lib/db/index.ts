/**
 * One database, two drivers.
 *
 * `DATABASE_URL` set   → postgres-js against Neon Postgres. This is what
 *                        Vercel runs.
 * `DATABASE_URL` unset → PGlite, real Postgres compiled to WASM, stored in
 *                        `.pglite/`. Same SQL, same migrations, no credentials
 *                        needed to run the survey locally.
 *
 * Nothing else in the codebase knows which one is in use.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as schema from './schema';

export type Db = Awaited<ReturnType<typeof create>>;

const LOCAL_DIR = process.env.PGLITE_DIR ?? '.pglite';

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * PGlite leaves a postmaster.pid behind when its process is killed rather than
 * closed — which is what happens every time a dev server is stopped — and then
 * refuses to open the directory again.
 *
 * Clearing it blindly would let two processes corrupt the same directory, so
 * record which process owns it and only reclaim when that process is gone.
 */
function reclaimLocalDir(dir: string) {
  mkdirSync(dir, { recursive: true });
  const pidFile = join(dir, 'postmaster.pid');
  const ownerFile = join(dir, '.owner');

  if (existsSync(pidFile)) {
    let owner: number | null = null;
    try {
      owner = Number(readFileSync(ownerFile, 'utf8').trim()) || null;
    } catch {
      owner = null;
    }

    if (owner && owner !== process.pid && isAlive(owner)) {
      throw new Error(
        `The local development database in ${dir} is open in process ${owner}. ` +
          `Stop it first, or set DATABASE_URL to use Neon instead.`,
      );
    }
    rmSync(pidFile, { force: true });
  }

  writeFileSync(ownerFile, String(process.pid));
}

/**
 * Postgres needs to write a checkpoint before it stops. Without this, stopping
 * the dev server leaves the directory unrecoverable and it has to be rebuilt
 * with `npm run db:reset`. A SIGKILL cannot be caught by anyone, so a hard kill
 * still costs a reset — the local database is disposable by design.
 */
function closeOnExit(client: { close: () => Promise<void> }) {
  let closing = false;
  const close = async (signal?: NodeJS.Signals) => {
    if (closing) return;
    closing = true;
    try {
      await client.close();
    } catch {
      // nothing useful to do while shutting down
    }
    if (signal) process.exit(0);
  };

  process.once('SIGINT', () => void close('SIGINT'));
  process.once('SIGTERM', () => void close('SIGTERM'));
  process.once('beforeExit', () => void close());
}

async function create() {
  const url = process.env.DATABASE_URL;

  /**
   * The local fallback is a development convenience and nothing else. On a
   * serverless host its directory is ephemeral and per-instance, so a client
   * could complete a twenty-minute questionnaire into a database that is
   * discarded when the function does. Refuse to start rather than lose a
   * client's answers.
   */
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is not set. Production must run on Neon Postgres — the local ' +
        'PGlite fallback is per-instance and ephemeral, and answers written to it would ' +
        'be lost. Set DATABASE_URL to the pooled Neon connection string.',
    );
  }

  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    // The pooler runs in transaction mode and cannot hold prepared statements.
    const client = postgres(url, { prepare: false });
    return drizzle(client, { schema });
  }

  const { drizzle } = await import('drizzle-orm/pglite');
  const { PGlite } = await import('@electric-sql/pglite');
  reclaimLocalDir(LOCAL_DIR);
  const client = new PGlite(LOCAL_DIR);
  closeOnExit(client);
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
