import { getDb, usingLocalDatabase } from '@/lib/db';
import { clients, projects, surveys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Milestone 1 has no team app. This is a holding page — milestone 2 replaces it
 * with the landing page specified in DESIGN.md §6: Needs you, All projects, and
 * the three destinations at the foot.
 *
 * The survey links are listed only when running against the local development
 * database, so this can never leak a live client's token.
 */
export default async function Home() {
  const local = usingLocalDatabase();
  let links: { token: string; client: string; pkg: string }[] = [];

  if (local) {
    const db = await getDb();
    links = (
      await db
        .select({ token: surveys.token, client: clients.name, pkg: projects.package })
        .from(surveys)
        .innerJoin(projects, eq(surveys.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
    ).map((r) => ({ token: r.token, client: r.client, pkg: r.pkg }));
  }

  return (
    <main className="holding">
      <h1>Designally</h1>
      <p>
        The team app arrives in milestone 2. Right now this project does one thing: it serves a
        bilingual questionnaire at <code>/s/&lt;token&gt;</code> and saves what comes back.
      </p>

      {local && (
        <div className="card">
          <h2>Development surveys</h2>
          <p style={{ marginBottom: 0 }}>
            Running on the local PGlite database. Set <code>DATABASE_URL</code> to point at Supabase.
          </p>
          <ul style={{ listStyle: 'none', marginTop: 'var(--sp-md)' }}>
            {links.map((l) => (
              <li key={l.token} style={{ padding: '8px 0' }}>
                <a href={`/s/${l.token}`} style={{ color: 'var(--primary)' }}>
                  /s/{l.token}
                </a>{' '}
                <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                  {l.client} · {l.pkg}
                </span>
              </li>
            ))}
            {!links.length && (
              <li style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                None yet — run <code>npm run db:seed</code>.
              </li>
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
