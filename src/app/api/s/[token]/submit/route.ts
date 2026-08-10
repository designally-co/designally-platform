import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';

import { getDb } from '@/lib/db';
import { answers, responses, surveyDrafts, surveys } from '@/lib/db/schema';
import { toAnswerValue, type DraftValues, type RawValue } from '@/lib/survey/answers';
import { loadSurvey, type SurveyQuestion } from '@/lib/survey/load';
import { normaliseToken } from '@/lib/survey/token';

export const dynamic = 'force-dynamic';

/**
 * Identity answers are promoted onto the response row so the analysis can weigh
 * a conflict by who said it without joining through answers. They are also kept
 * as ordinary answer rows, so `answers` remains a complete record of what was
 * asked and what came back.
 *
 * The identity block's first two short answers are the name and the role; the
 * decision-maker question carries `maps_to: "decision_maker"` in the seed.
 */
function identityOf(questions: SurveyQuestion[], values: DraftValues) {
  const identity = questions.filter((q) => q.blockKey === 'identity');
  const text = (q?: SurveyQuestion) => {
    const v = q ? values[q.ref] : undefined;
    return typeof v === 'string' ? v.trim() : '';
  };

  const shortAnswers = identity.filter((q) => q.type === 'short_text');
  const decisionQuestion = identity.find((q) => q.config.maps_to === 'decision_maker');

  const decisionRaw = decisionQuestion ? values[decisionQuestion.ref] : undefined;
  const decisionMaker =
    decisionRaw && typeof decisionRaw === 'object' && 'choice' in decisionRaw
      ? decisionRaw.choice
      : '';

  return {
    name: text(shortAnswers[0]),
    role: text(shortAnswers[1]),
    /* stored verbatim — "Shared — we decide as a group" is not a boolean */
    decisionMaker: decisionMaker || null,
  };
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/s/[token]/submit'>) {
  const { token } = await ctx.params;
  const body = (await req.json()) as { key?: string; values?: DraftValues };
  const values = body.values ?? {};

  const db = await getDb();
  const [survey] = await db
    .select()
    .from(surveys)
    .where(eq(surveys.token, normaliseToken(token)))
    .limit(1);

  if (!survey) return NextResponse.json({ error: 'no such survey' }, { status: 404 });

  // Rule 1 — closing is a human act, and a closed survey takes no more answers.
  if (survey.closedAt) return NextResponse.json({ error: 'survey closed' }, { status: 409 });

  const payload = await loadSurvey(token);
  if (!payload) return NextResponse.json({ error: 'no such survey' }, { status: 404 });

  const questions = payload.steps.flatMap((s) => s.questions);
  const { name, role, decisionMaker } = identityOf(questions, values);

  if (!name) return NextResponse.json({ error: 'respondent name is required' }, { status: 400 });

  const rows = questions
    .map((q) => ({
      questionId: q.id,
      value: toAnswerValue(q.type, q.config, values[q.ref] as RawValue | undefined),
    }))
    /* A blank answer is left absent rather than written as an empty row. The
       analysis reads that absence as a clarity gap — it is real information. */
    .filter((r): r is { questionId: string; value: NonNullable<typeof r.value> } => r.value !== null);

  const [response] = await db
    .insert(responses)
    .values({
      surveyId: survey.id,
      respondentName: name,
      role: role || null,
      decisionMaker,
    })
    .returning();

  if (rows.length) {
    await db
      .insert(answers)
      .values(rows.map((r) => ({ responseId: response.id, questionId: r.questionId, value: r.value })));
  }

  if (body.key) {
    await db
      .delete(surveyDrafts)
      .where(and(eq(surveyDrafts.surveyId, survey.id), eq(surveyDrafts.draftKey, body.key)));
  }

  return NextResponse.json({ ok: true, answers: rows.length });
}
