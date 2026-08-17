/**
 * What the database will actually put in front of a client.
 *
 * Run it against a database before sending a link. It reads the questions
 * back out rather than reading `seed/question-blocks.json`, so it answers the
 * one question the seed's own output cannot: did the file reach the database
 * this survey will be served from?
 *
 *   npx tsx scripts/check-questions.mts                       # local PGlite
 *   DATABASE_URL="<neon>" npx tsx scripts/check-questions.mts # Neon
 *
 * `.mts`, not `.ts`. tsx compiles a `.ts` file as CommonJS, which has no
 * top-level await, and every line here needs one.
 *
 * The Thai check exists because of a real defect: question version 6 stripped a
 * label prefix from seven questions, and on `visual.7` the cut landed mid
 * sentence and left the Thai opening with a bare lowercase "requirement". Thai
 * has no capitals to make that obvious and nobody reading English would see it,
 * so it is worth a machine looking every time.
 */
import { desc, eq } from 'drizzle-orm';

import { getDb, usingLocalDatabase } from '../src/lib/db';
import { questionBlocks, questions, surveys } from '../src/lib/db/schema';

const db = await getDb();
const where = usingLocalDatabase() ? 'local PGlite (.pglite)' : 'DATABASE_URL';
console.log(`\nReading ${where}\n`);

const blocks = await db.select().from(questionBlocks);
const rows = await db.select().from(questions);

/* Latin at the head of a Thai string. A loanword mid-sentence is ordinary Thai
   and is not reported; a sentence that *begins* with one is what a truncated
   prefix looks like. */
const opensLatin = (s: string | null) => !!s && /^[A-Za-z]/.test(s.trim());

let latest = 0;
for (const r of rows) latest = Math.max(latest, r.version);

let help = 0;
let suspect: string[] = [];

console.log(`Latest question version: ${latest}\n`);
for (const b of blocks.sort((a, c) => a.key.localeCompare(c.key))) {
  const mine = rows.filter((r) => r.blockId === b.id && r.version === latest);
  if (!mine.length) continue;
  const withHelp = mine.filter((q) => q.helpEn || q.helpTh);
  help += withHelp.length;
  for (const q of mine) {
    if (opensLatin(q.textTh)) suspect.push(`${b.key}.${q.order}  ${q.textTh}`);
  }
  console.log(
    `  ${b.key.padEnd(10)} ${String(mine.length).padStart(2)} questions` +
      (withHelp.length ? `  ${withHelp.length} with help` : ''),
  );
}

console.log(`\n${help} question${help === 1 ? '' : 's'} carry help text.`);

if (suspect.length) {
  console.log(`\n${suspect.length} Thai string${suspect.length === 1 ? '' : 's'} opening with a Latin word:`);
  for (const s of suspect) console.log(`  ${s}`);
} else {
  console.log('\nNo Thai string opens with a Latin word.');
}

/* Which version each live link is frozen at — a survey sent before a
   correction keeps the questions it was sent with, which is rule 5 and not a
   defect, but it is the thing most likely to be mistaken for one. */
const live = await db.select().from(surveys).orderBy(desc(surveys.id)).limit(8);
if (live.length) {
  console.log('\nMost recent surveys:');
  for (const s of live) {
    const stale = s.questionVersion < latest ? `  <-- frozen below ${latest}` : '';
    console.log(`  /s/${s.token}  version ${s.questionVersion}${stale}`);
  }
}

console.log('');
process.exit(0);
