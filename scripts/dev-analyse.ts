/**
 * Development only. Runs the real analysis against a survey and prints the
 * brief, without the team app, without auth, and without storing anything.
 *
 *   npm run dev:fixture         # five synthetic respondents with planted findings
 *   npm run dev:analyse         # the newest fixture survey
 *   npm run dev:analyse -- <token>
 *
 * Why this exists. The prompt in `src/lib/analysis/prompt.ts` was tuned against
 * the real ARUN+ data, which was collected at question version 1 — every
 * respondent carried a role and a decision-maker flag, and the acceptance test
 * was passed by grouping on them. Version 3 collects a name and nothing else.
 * Changing the prompt is now the highest-risk edit in the codebase and the one
 * with no test around it, because the only way to see the output was to close a
 * real client's survey. This is that test.
 *
 * It checks the two things that are cheap to get wrong and expensive to notice:
 * that no contact detail reaches the API, and that the brief still contains the
 * findings the fixture planted.
 */
import { desc, eq } from 'drizzle-orm';

import { getDb } from '../src/lib/db';
import { clients, projects, surveys } from '../src/lib/db/schema';
import { analyse } from '../src/lib/analysis/run';
import { buildTranscript } from '../src/lib/analysis/transcript';
import { packageFull } from '../src/lib/team/labels';

/** Each planted finding, and a cheap way to look for it in the output. */
const PLANTED: { name: string; hint: RegExp }[] = [
  { name: 'audience split — industrial buyers vs walk-in consumers', hint: /B2B|B2C|จัดซื้อ|procurement|industrial|walk|consumer|โรงงาน|หน้าร้าน|audience|customer/i },
  { name: 'mutual-avoid tone contradiction', hint: /avoid|playful|serious|corporate|tone/i },
  { name: 'clarity gaps — blanks and "ยังไม่มี"', hint: /blank|unanswered|ยังไม่มี|no answer|gap|not decided|left/i },
  { name: 'outlier — one person against the rest', hint: /outlier|alone|only one|one person|against/i },
  { name: 'stated–revealed gap — accessible, admires luxury', hint: /Herm|Aesop|Apple|luxur|exclusiv|accessible|premium/i },
];

async function main() {
  const token = process.argv[2];
  const db = await getDb();

  const rows = await db
    .select({ s: surveys, c: clients, p: projects })
    .from(surveys)
    .innerJoin(projects, eq(surveys.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .orderBy(desc(surveys.openedAt));

  const row = token
    ? rows.find((r) => r.s.token === token)
    : (rows.find((r) => r.c.projectCode === 'FIXTURE') ?? rows[0]);

  if (!row) throw new Error(token ? `No survey with token ${token}` : 'No surveys. Run npm run dev:fixture.');

  const { transcript, respondentCount, questionCount } = await buildTranscript(row.s.id);
  if (respondentCount === 0) throw new Error(`/s/${row.s.token} has no responses.`);

  console.log(`\n${row.c.name} · /s/${row.s.token} · question version ${row.s.questionVersion}`);
  console.log(`${respondentCount} respondents · ${questionCount} questions · ${transcript.length} characters\n`);

  /* Rule: contact detail is not evidence and does not go to the API. */
  const leaks = [
    ['an email address', /[\w.+-]+@[\w-]+\.[\w.]+/],
    ['a role or authority claim', /\brole:|decision maker/i],
  ] as const;
  for (const [what, pattern] of leaks) {
    const found = pattern.test(transcript);
    console.log(`  ${found ? '✗' : '✓'} transcript contains ${what}: ${found ? 'YES — this is a bug' : 'no'}`);
  }

  console.log('\nCalling the API…');
  const started = Date.now();
  const result = await analyse({
    clientName: row.c.name,
    packageLabel: packageFull(row.p.package),
    respondentCount,
    transcript,
  });
  const seconds = Math.round((Date.now() - started) / 1000);

  if (!result.ok) {
    console.error(`\nFAILED after ${seconds}s: ${result.error}`);
    process.exit(1);
  }

  const brief = result.brief;
  console.log(`Done in ${seconds}s · ${result.usage.input} in / ${result.usage.output} out\n`);

  console.log('─'.repeat(72));
  console.log(brief.headline.toUpperCase());
  console.log(brief.headlineBody);
  console.log('─'.repeat(72));

  console.log(`\nSETTLED (${brief.settled.length})`);
  for (const s of brief.settled) console.log(`  · ${s.statement}\n      ${s.respondents.join(', ')}`);

  console.log(`\nUNSETTLED (${brief.unsettled.length})`);
  for (const c of brief.unsettled) {
    console.log(`  · [${c.severity}] ${c.question}`);
    for (const side of c.sides) console.log(`      "${side.position}" — ${side.respondents.join(', ')}`);
    console.log(`      why: ${c.severityReason}`);
  }

  console.log(`\nNOT DECIDED YET (${brief.notDecidedYet.length})`);
  for (const g of brief.notDecidedYet) console.log(`  · ${g.topic} — ${g.whatWasSeen}`);

  console.log(`\nFLAGS (${brief.flags.length})`);
  for (const f of brief.flags) console.log(`  · [${f.severity}] ${f.label}: ${f.finding}`);

  console.log(`\nALIGNMENT: ${brief.alignment} — ${brief.alignmentReason}`);

  console.log(`\nFOR THE CREATIVE TEAM (${brief.creativeNotes.length})`);
  for (const n of brief.creativeNotes) console.log(`  · ${n.heading}: ${n.body}`);

  /* Did the planted findings survive? A keyword hit is weak evidence — it says
     the subject was mentioned, not that the reading was right. Read the output
     above; this is only a fast way to spot something that vanished entirely. */
  const haystack = JSON.stringify(brief);
  console.log('\n' + '─'.repeat(72));
  console.log('PLANTED FINDINGS — mentioned anywhere in the brief?');
  let missing = 0;
  for (const p of PLANTED) {
    const hit = p.hint.test(haystack);
    if (!hit) missing++;
    console.log(`  ${hit ? '✓' : '✗'} ${p.name}`);
  }
  console.log(
    missing
      ? `\n${missing} planted finding(s) not mentioned at all. Read the brief above before believing the tick marks.`
      : '\nAll five mentioned. Now read the brief above and judge whether it read them correctly.',
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e.stack ?? e.message ?? e);
  process.exit(1);
});
