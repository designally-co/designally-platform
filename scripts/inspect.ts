/**
 * Reads back what a survey collected. Milestone 1 has no team app, so this is
 * how the answers are checked until milestone 2 renders them.
 */
import { eq } from 'drizzle-orm';

import { getDb } from '../src/lib/db';
import { answers, questions, responses, surveys } from '../src/lib/db/schema';

async function main() {
  const db = await getDb();
  const all = await db.select().from(surveys);

  for (const survey of all) {
    const people = await db.select().from(responses).where(eq(responses.surveyId, survey.id));

    console.log(`\n/s/${survey.token} — ${people.length} ${people.length === 1 ? 'answer' : 'answers'} so far`);

    for (const person of people) {
      console.log(
        `\n  ${person.respondentName}${person.role ? ` · ${person.role}` : ''}` +
          `\n  submitted ${person.submittedAt.toISOString()}`,
      );

      const rows = await db
        .select({ order: questions.order, text: questions.textEn, value: answers.value })
        .from(answers)
        .innerJoin(questions, eq(answers.questionId, questions.id))
        .where(eq(answers.responseId, person.id));

      console.log(`  ${rows.length} answers stored`);
      for (const r of rows.slice(0, 40)) {
        const v = r.value;
        const shown =
          v.kind === 'text'
            ? v.text
            : v.kind === 'choice'
              ? v.choice
              : v.kind === 'multi'
                ? `${v.choices.length} selected: ${v.choices.slice(0, 3).join(', ')}…`
                : `${Object.keys(v.values).length} of the pairs, ${v.points}-point`;
        console.log(`    · ${r.text.slice(0, 44).padEnd(46)} ${shown.slice(0, 60)}`);
      }
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
