import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  answers,
  projects,
  questionBlocks,
  questions,
  responses,
  surveys,
  type AnswerValue,
} from '@/lib/db/schema';

/**
 * Every answer a client gave, as the team reads it.
 *
 * The engine stopped interpreting answers on 13 August 2026, on the grounds
 * that reading them is the team's job. That was only defensible once the team
 * could actually read them — until this file, the app showed a count and
 * nothing else, and the only way to see an answer was `scripts/inspect.ts` in a
 * terminal.
 *
 * **Every question, not only the answered ones.** A blank is the finding the
 * insight spec calls pure gold: read individually it looks like a lazy answer,
 * read together with the others it says the organisation has not decided this
 * yet. A view that quietly omitted them would hide exactly what the team is
 * here to notice.
 *
 * Questions are loaded at the survey's own version — rule 5 — so a survey sent
 * in August still reads back the questions August asked.
 */
export type ReadableAnswer = {
  order: number;
  /** null for the identity block, which the survey never numbers */
  number: number | null;
  textEn: string;
  textTh: string | null;
  blockKey: string;
  value: AnswerValue | null;
};

export type RespondentAnswers = {
  name: string;
  email: string | null;
  submittedAt: Date;
  answered: number;
  blank: number;
  answers: ReadableAnswer[];
};

export type ProjectAnswers = {
  clientName: string;
  questionVersion: number;
  respondents: RespondentAnswers[];
};

export async function loadProjectAnswers(projectId: string): Promise<ProjectAnswers | null> {
  const db = await getDb();

  const [row] = await db
    .select({ survey: surveys, project: projects })
    .from(surveys)
    .innerJoin(projects, eq(projects.id, surveys.projectId))
    .where(eq(surveys.projectId, projectId))
    .limit(1);
  if (!row) return null;

  const people = await db
    .select()
    .from(responses)
    .where(eq(responses.surveyId, row.survey.id))
    .orderBy(asc(responses.submittedAt));
  if (!people.length) {
    return { clientName: '', questionVersion: row.survey.questionVersion, respondents: [] };
  }

  const blocks = await db
    .select()
    .from(questionBlocks)
    .where(inArray(questionBlocks.key, row.survey.blockKeys));
  const blockById = new Map(blocks.map((b) => [b.id, b.key]));

  /* rule 5 — the version frozen onto the survey, never the current one */
  const asked = (
    await db
      .select()
      .from(questions)
      .where(
        inArray(
          questions.blockId,
          blocks.map((b) => b.id),
        ),
      )
  )
    .filter((q) => q.version === row.survey.questionVersion)
    .sort((a, b) => {
      /* block order follows the survey's own blockKeys, so the team reads them
         in the order the client was asked */
      const at = blockById.get(a.blockId);
      const bt = blockById.get(b.blockId);
      const ai = at ? row.survey.blockKeys.indexOf(at) : -1;
      const bi = bt ? row.survey.blockKeys.indexOf(bt) : -1;
      return ai === bi ? a.order - b.order : ai - bi;
    });

  const given = await db
    .select()
    .from(answers)
    .where(
      inArray(
        answers.responseId,
        people.map((p) => p.id),
      ),
    );
  const byResponse = new Map<string, Map<string, AnswerValue>>();
  for (const a of given) {
    const map = byResponse.get(a.responseId) ?? new Map();
    map.set(a.questionId, a.value);
    byResponse.set(a.responseId, map);
  }

  /* the number the respondent saw beside the question, so a blank in this view
     and a blank on the send screen are the same question to both of them */
  let n = 0;
  const numbered = new Map<string, number | null>();
  for (const q of asked) {
    const identity = blockById.get(q.blockId) === 'identity';
    numbered.set(q.id, identity ? null : ++n);
  }

  return {
    clientName: row.project.clientId,
    questionVersion: row.survey.questionVersion,
    respondents: people.map((p) => {
      const mine = byResponse.get(p.id) ?? new Map();
      const list: ReadableAnswer[] = asked.map((q) => ({
        order: q.order,
        number: numbered.get(q.id) ?? null,
        textEn: q.textEn,
        textTh: q.textTh,
        blockKey: blockById.get(q.blockId) ?? '',
        value: mine.get(q.id) ?? null,
      }));
      return {
        name: p.respondentName,
        email: p.email,
        submittedAt: p.submittedAt,
        answered: list.filter((a) => a.value !== null).length,
        blank: list.filter((a) => a.value === null).length,
        answers: list,
      };
    }),
  };
}
