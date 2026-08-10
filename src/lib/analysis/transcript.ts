import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  answers,
  questionBlocks,
  questions,
  responses,
  surveys,
  type AnswerValue,
  type QuestionConfig,
} from '@/lib/db/schema';

/**
 * Turns a survey's answers into the text the analysis reads.
 *
 * Grouped by respondent rather than by question, because the findings that
 * matter come from comparing whole people — a department that disagrees about
 * the business, one person answering against everyone else. Grouped by
 * question, that comparison has to be reassembled by the model.
 *
 * Unanswered required questions are printed as "(left blank)" rather than
 * skipped. A blank is a finding (docs/insight-engine-spec.md, "clarity gaps"),
 * and a transcript that silently omits them makes that finding invisible.
 */
export async function buildTranscript(surveyId: string) {
  const db = await getDb();

  const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
  if (!survey) throw new Error('No such survey.');

  const blocks = await db
    .select()
    .from(questionBlocks)
    .where(inArray(questionBlocks.key, survey.blockKeys));

  const questionRows = blocks.length
    ? await db
        .select()
        .from(questions)
        .where(
          and(
            inArray(
              questions.blockId,
              blocks.map((b) => b.id),
            ),
            eq(questions.version, survey.questionVersion),
          ),
        )
        .orderBy(asc(questions.order))
    : [];

  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const people = await db
    .select()
    .from(responses)
    .where(eq(responses.surveyId, surveyId))
    .orderBy(asc(responses.submittedAt));

  const allAnswers = people.length
    ? await db
        .select()
        .from(answers)
        .where(
          inArray(
            answers.responseId,
            people.map((p) => p.id),
          ),
        )
    : [];

  const byResponse = new Map<string, Map<string, AnswerValue>>();
  for (const a of allAnswers) {
    const m = byResponse.get(a.responseId) ?? new Map();
    m.set(a.questionId, a.value as AnswerValue);
    byResponse.set(a.responseId, m);
  }

  /* Order questions the way they were asked, block by block. */
  const ordered = [...questionRows].sort((a, b) => {
    const ka = blockById.get(a.blockId)!.key;
    const kb = blockById.get(b.blockId)!.key;
    const bi = survey.blockKeys.indexOf(ka) - survey.blockKeys.indexOf(kb);
    return bi !== 0 ? bi : a.order - b.order;
  });

  const sections = people.map((person) => {
    const given = byResponse.get(person.id) ?? new Map();

    const lines = ordered.map((q) => {
      const value = given.get(q.id);
      const rendered = value ? renderAnswer(value, q.config as QuestionConfig) : '(left blank)';
      return `Q: ${q.textEn}\nA: ${rendered}`;
    });

    const who = [
      person.respondentName,
      person.role ? `role: ${person.role}` : 'role not given',
      person.decisionMaker
        ? `final decision maker: ${person.decisionMaker}`
        : 'did not answer whether they are a decision maker',
    ].join(' · ');

    return `### ${who}\n\n${lines.join('\n\n')}`;
  });

  return {
    transcript: sections.join('\n\n---\n\n'),
    respondentCount: people.length,
    questionCount: ordered.length,
  };
}

/** Answers are rendered so a reader can tell a blank from a short answer. */
function renderAnswer(value: AnswerValue, config: QuestionConfig): string {
  switch (value.kind) {
    case 'text':
      return value.text.trim() || '(left blank)';

    case 'choice':
      return value.other ? `${value.choice} — "${value.other}"` : value.choice;

    case 'multi': {
      const chosen = value.choices.join(', ');
      return value.other ? `${chosen}, other: "${value.other}"` : chosen || '(left blank)';
    }

    case 'scale': {
      /* Poles are named on every line so the position is readable without
         counting back to the question — "3 of 5" alone says nothing. */
      const pairs = config.pairs ?? [];
      const entries = Object.entries(value.values);
      if (!entries.length) return '(left blank)';
      return entries
        .map(([index, point]) => {
          const pair = pairs[Number(index)];
          if (!pair) return `pair ${index}: ${point} of ${value.points}`;
          return `${pair.left_en} – ${pair.right_en}: ${point} of ${value.points} (1 = ${pair.left_en}, ${value.points} = ${pair.right_en})`;
        })
        .join('\n   ');
    }
  }
}
