import { and, desc, eq, lt, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { clients, insights, projects, responses, surveys } from '@/lib/db/schema';
import { packageLabel } from '@/lib/team/labels';

/**
 * The analysis runs itself once a survey's date has passed — 20 August 2026,
 * asked for.
 *
 * **This does not break rule 1 or principle 4, and the distinction is the whole
 * reason it can exist.** Both forbid the app *closing a survey* or *archiving a
 * project* on a timer, and forbid a date writing `closed_at` or `closed_by`.
 * This writes none of those: it inserts an `insights` row and nothing else, so
 * every gate in the product still records only what a person did. Generating
 * the insights was never a gate — confirming them was, and that gate was
 * retired on 18 August.
 *
 * What it replaces is a notification saying "the date has passed with 3 answers
 * in, the analysis has not been run" and a person pressing a button that reads
 * every one of those answers with no choices to make. That is a step, not a
 * decision.
 *
 * **A cron and not a page load.** The obvious cheap version is to notice the
 * lapse while building the projects list and start a run there, and it is wrong
 * twice over: it puts a three-minute, paid side effect inside a read that
 * happens on every visit, and two people opening the app at once would start
 * two analyses of the same survey. A scheduled invocation happens once, on its
 * own, whether or not anybody is looking.
 *
 * Daily, because the thing it watches is a *date*. `0 1 * * *` is 08:00 in
 * Bangkok, which is a survey that lapsed overnight being read before the team
 * opens the app rather than after.
 */
export const dynamic = 'force-dynamic';

/**
 * Two passes of Opus take about three minutes, so the ceiling is the practical
 * maximum — the same one the page that runs this by hand takes, and for the
 * same reason. See `maxDuration` in `app/page.tsx`.
 */
export const maxDuration = 300;

/**
 * How long to keep starting new analyses.
 *
 * The function is killed at 300s, and a run cut off halfway is a paid API call
 * whose result is thrown away. Nothing new is started past this mark, which
 * leaves room for one in flight to finish.
 */
const START_UNTIL_MS = 150_000;

export async function GET(request: Request) {
  /**
   * Vercel signs its cron invocations with `CRON_SECRET`. This is not optional
   * politeness: the route spends money at Anthropic, and an unauthenticated one
   * is a way for anybody who guesses the path to spend it. With no secret set
   * it refuses rather than running openly.
   */
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: 'CRON_SECRET is not set.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Not authorised.' }, { status: 401 });
  }

  const db = await getDb();
  const startedAt = Date.now();

  /**
   * Every survey that has stopped taking answers, has answers, and has no
   * analysis.
   *
   * `dueAt < now` is the whole condition, and it covers the manual close too:
   * `closeCollection` moves `due_at` to the moment it closed (rule 1 — one
   * date, one meaning), so a survey somebody shut by hand is also past its
   * date. That is deliberate rather than incidental — it means a close whose
   * analysis failed, or timed out, is retried here instead of waiting for
   * somebody to notice the notification.
   *
   * Archived projects are excluded: they are finished, and an analysis
   * appearing on one is the app doing work nobody asked for on a closed file.
   */
  const lapsed = await db
    .select({
      surveyId: surveys.id,
      projectId: surveys.projectId,
      clientName: clients.name,
      package: projects.package,
      dueAt: surveys.dueAt,
      answers: sql<number>`count(${responses.id})`.mapWith(Number),
    })
    .from(surveys)
    .innerJoin(projects, eq(surveys.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(responses, eq(responses.surveyId, surveys.id))
    .where(
      and(
        eq(surveys.kind, 'discovery'),
        eq(projects.archived, false),
        lt(surveys.dueAt, new Date()),
        /* no analysis on this project yet — the correlated form rather than a
           join, so a project with several surveys cannot double-count */
        sql`not exists (select 1 from ${insights} where ${insights.projectId} = ${surveys.projectId})`,
      ),
    )
    .groupBy(surveys.id, surveys.projectId, clients.name, projects.package, surveys.dueAt)
    .having(sql`count(${responses.id}) > 0`)
    /* oldest lapse first: the one that has been waiting longest is the one a
       person is most likely to be waiting on */
    .orderBy(surveys.dueAt);

  const { buildTranscript } = await import('@/lib/analysis/transcript');
  const { analyse } = await import('@/lib/analysis/run');

  const written: string[] = [];
  const failed: { client: string; error: string }[] = [];
  let deferred = 0;

  for (const row of lapsed) {
    if (Date.now() - startedAt > START_UNTIL_MS) {
      deferred += 1;
      continue;
    }

    try {
      /* Every answer that arrived, with no `only` — there is nobody here to
         choose, and the whole set is what the manual close reads too. */
      const { transcript, respondentCount, sources } = await buildTranscript(row.surveyId);
      if (respondentCount === 0) continue;

      const result = await analyse({
        clientName: row.clientName,
        packageLabel: packageLabel(row.package),
        respondentCount,
        transcript,
      });

      if (!result.ok) {
        failed.push({ client: row.clientName, error: result.error });
        continue;
      }

      /**
       * Inserted only if there is still nothing there.
       *
       * Between the query above and this line a person may have pressed
       * Generate on the same project — the notification for it is on their
       * screen the whole time this is running. Two analyses of one survey
       * minutes apart is money spent twice and a version list that lies about
       * what happened.
       */
      const [existing] = await db
        .select({ id: insights.id })
        .from(insights)
        .where(eq(insights.projectId, row.projectId))
        .orderBy(desc(insights.generatedAt))
        .limit(1);
      if (existing) continue;

      await db.insert(insights).values({
        sources,
        projectId: row.projectId,
        content: result.insights,
      });
      written.push(row.clientName);
    } catch (e) {
      failed.push({ client: row.clientName, error: e instanceof Error ? e.message : String(e) });
    }
  }

  /* Reported rather than logged and forgotten: this is the only view anybody
     has of a job that runs while nobody is watching. `deferred` is not a
     failure — those are read on the next run, and the notification for each is
     on the team's screen until then. */
  return Response.json({
    ok: true,
    found: lapsed.length,
    written,
    failed,
    deferred,
    ms: Date.now() - startedAt,
  });
}

/* A null `due_at` fails `lt` on its own, so surveys sent before the field
   existed are never picked up here — which is right: they have no date to have
   passed. */
