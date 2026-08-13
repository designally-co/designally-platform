/**
 * Clears the client-side data and every retired question version, leaving the
 * database as if the current questionnaire were the only one there had been.
 *
 *   npm run db:clear                          # inventory only — deletes nothing
 *   npm run db:clear -- --delete              # local database
 *   CONFIRM=yes npm run db:clear -- --delete  # a real one
 *
 * It prints what it will remove and waits to be told again. Two guards, because
 * this is the one script in the repo that destroys work: it deletes nothing
 * unless `--delete` is passed, and against anything other than the local PGlite
 * file it also requires `CONFIRM=yes`.
 *
 * **What it keeps.**
 *
 *   `users`           — real Google accounts, and the record of who acted on
 *                       every gate. Nothing references them once the projects
 *                       are gone, but they are not mock data.
 *   `question_blocks` — the library itself.
 *   `questions`       — at the current version only.
 *
 * **Why the old question versions go too.** Rule 5 keeps every version an
 * already-sent survey might need, and deleting one would normally orphan a real
 * insights. Once there are no surveys left there is nothing to orphan, and leaving
 * three versions stacked in the table is what made the new-survey sheet offer
 * "Brand · 50 questions". Re-seed after this and the table holds one version.
 */
import { count, eq, ne } from 'drizzle-orm';

import { getDb, usingLocalDatabase } from '../src/lib/db';
import {
  answers,
  insights,
  clients,
  decisions,
  projects,
  questionBlocks,
  questions,
  responses,
  surveyDrafts,
  surveys,
  users,
} from '../src/lib/db/schema';
import { CURRENT_QUESTION_VERSION } from '../src/lib/survey/packages';

const GOING = [
  ['answers', answers],
  ['survey_drafts', surveyDrafts],
  ['responses', responses],
  ['insights', insights],
  ['decisions', decisions],
  ['surveys', surveys],
  ['projects', projects],
  ['clients', clients],
] as const;

async function tally(db: Awaited<ReturnType<typeof getDb>>) {
  const out: Record<string, number> = {};
  for (const [name, table] of GOING) {
    const [row] = await db.select({ n: count() }).from(table);
    out[name] = row?.n ?? 0;
  }
  return out;
}

async function main() {
  const deleting = process.argv.includes('--delete');
  const local = usingLocalDatabase();
  const db = await getDb();

  console.log(`\nDatabase: ${local ? 'local PGlite (.pglite)' : 'DATABASE_URL — a real one'}`);

  /* Name every survey, so nobody discovers afterwards that one of them mattered. */
  const rows = await db
    .select({
      client: clients.name,
      code: clients.projectCode,
      token: surveys.token,
      version: surveys.questionVersion,
      openedAt: surveys.openedAt,
    })
    .from(clients)
    .leftJoin(projects, eq(projects.clientId, clients.id))
    .leftJoin(surveys, eq(surveys.projectId, projects.id));

  const counts = await tally(db);
  const [{ n: totalQuestions }] = await db.select({ n: count() }).from(questions);
  const [{ n: currentQuestions }] = await db
    .select({ n: count() })
    .from(questions)
    .where(eq(questions.version, CURRENT_QUESTION_VERSION));
  const [{ n: userCount }] = await db.select({ n: count() }).from(users);
  const [{ n: blockCount }] = await db.select({ n: count() }).from(questionBlocks);

  console.log('\nGOING');
  for (const [name] of GOING) console.log(`  ${String(counts[name]).padStart(5)}  ${name}`);
  console.log(
    `  ${String(totalQuestions - currentQuestions).padStart(5)}  questions at a retired version`,
  );

  if (rows.length) {
    console.log('\n  every survey that will be destroyed:');
    for (const r of rows) {
      const when = r.openedAt ? new Date(r.openedAt).toISOString().slice(0, 10) : '—';
      console.log(
        `    ${r.token ? `/s/${r.token}` : '(no survey)'.padEnd(14)}  ${r.client}` +
          `${r.code ? ` · ${r.code}` : ''}  version ${r.version ?? '—'}  opened ${when}`,
      );
    }
  }

  console.log('\nSTAYING');
  console.log(`  ${String(userCount).padStart(5)}  users`);
  console.log(`  ${String(blockCount).padStart(5)}  question_blocks`);
  console.log(`  ${String(currentQuestions).padStart(5)}  questions at version ${CURRENT_QUESTION_VERSION}`);

  if (!deleting) {
    console.log('\nNothing was deleted. Add --delete to do it.');
    if (!local) console.log('Against this database you will also need CONFIRM=yes.');
    process.exit(0);
  }

  if (!local && process.env.CONFIRM !== 'yes') {
    console.error('\nRefusing: this is not the local database. Re-run with CONFIRM=yes.');
    process.exit(1);
  }

  /* clients cascades through projects, surveys, drafts, responses, answers,
     insights and decisions — but delete answers first anyway, because
     answers.question_id has no cascade and the retired questions go next. */
  await db.delete(clients);

  /* counted first — `getDb` returns one of two drivers and their `.returning()`
     overloads do not agree, so the count is taken rather than returned */
  const retired = totalQuestions - currentQuestions;
  await db.delete(questions).where(ne(questions.version, CURRENT_QUESTION_VERSION));

  const after = await tally(db);
  const left = Object.values(after).reduce((a, b) => a + b, 0);

  console.log(`\nDeleted. ${retired} retired question rows went with it.`);
  console.log(left === 0 ? 'Every table above is empty.' : `WARNING — ${left} rows survived: ${JSON.stringify(after)}`);
  console.log(`\nRun npm run db:seed if the question library needs rebuilding.`);
  process.exit(left === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e.stack ?? e.message ?? e);
  process.exit(1);
});
