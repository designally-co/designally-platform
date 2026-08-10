/**
 * Development only. Moves a survey and its answers back in time so the
 * 5-quiet-day promotion into "Needs you" can be seen without waiting five days.
 *
 *   npm run dev:backdate -- <token> <days>
 *
 * Nothing in the app writes dates like this — the app never rewrites history,
 * and this file exists purely so the quiet-survey prompt is testable.
 */
import { eq, sql } from 'drizzle-orm';

import { getDb, usingLocalDatabase } from '../src/lib/db';
import { responses, surveys } from '../src/lib/db/schema';
import { normaliseToken } from '../src/lib/survey/token';

async function main() {
  if (!usingLocalDatabase() && process.env.ALLOW_BACKDATE !== 'yes') {
    throw new Error(
      'Refusing to rewrite dates on a real database. Set ALLOW_BACKDATE=yes if you really mean it.',
    );
  }

  const [rawToken, rawDays] = process.argv.slice(2);
  if (!rawToken) throw new Error('Usage: npm run dev:backdate -- <token> <days>');
  const days = Number(rawDays ?? 6);

  const db = await getDb();
  const shift = sql.raw(`interval '${Math.floor(days)} days'`);

  const [survey] = await db
    .update(surveys)
    .set({ openedAt: sql`${surveys.openedAt} - ${shift}` })
    .where(eq(surveys.token, normaliseToken(rawToken)))
    .returning();

  if (!survey) throw new Error(`No survey with token ${rawToken}`);

  await db
    .update(responses)
    .set({ submittedAt: sql`${responses.submittedAt} - ${shift}` })
    .where(eq(responses.surveyId, survey.id));

  console.log(`Moved /s/${survey.token} and its answers back ${days} days.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
