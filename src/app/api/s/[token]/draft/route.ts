import { and, eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';

import { getDb } from '@/lib/db';
import { projects, surveyDrafts, surveys } from '@/lib/db/schema';
import type { DraftValues } from '@/lib/survey/answers';
import { normaliseToken } from '@/lib/survey/token';

export const dynamic = 'force-dynamic';

/**
 * The server copy of a part-finished survey. One link is shared between several
 * stakeholders, so a draft belongs to a device — `key` comes from that
 * browser's localStorage, never from the token alone.
 *
 * A draft is never promoted to a response. Only a submit writes one.
 */

/**
 * The survey and whether its project is still live.
 *
 * Joined rather than fetched separately because both doors this route guards —
 * a closed survey and an archived project — are one question to the caller:
 * is this link still taking anything?
 */
async function openSurvey(token: string) {
  const db = await getDb();
  const [row] = await db
    .select({ survey: surveys, archived: projects.archived })
    .from(surveys)
    .innerJoin(projects, eq(surveys.projectId, projects.id))
    .where(eq(surveys.token, normaliseToken(token)))
    .limit(1);
  return { db, survey: row?.survey, archived: row?.archived ?? false };
}

export async function GET(req: NextRequest, ctx: RouteContext<'/api/s/[token]/draft'>) {
  const { token } = await ctx.params;
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ draft: null });

  const { db, survey } = await openSurvey(token);
  if (!survey) return NextResponse.json({ draft: null }, { status: 404 });

  const [draft] = await db
    .select()
    .from(surveyDrafts)
    .where(and(eq(surveyDrafts.surveyId, survey.id), eq(surveyDrafts.draftKey, key)))
    .limit(1);

  if (!draft) return NextResponse.json({ draft: null });

  return NextResponse.json({
    draft: {
      step: draft.step,
      values: draft.values as DraftValues,
      updatedAt: draft.updatedAt.getTime(),
    },
  });
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/s/[token]/draft'>) {
  const { token } = await ctx.params;
  const body = (await req.json()) as { key?: string; step?: number; values?: DraftValues };

  if (!body.key) return NextResponse.json({ error: 'missing key' }, { status: 400 });

  const { db, survey, archived } = await openSurvey(token);
  if (!survey) return NextResponse.json({ error: 'no such survey' }, { status: 404 });

  // Two of these happened because a person did them; the third is the date the
  // team set. Either way, stop saving.
  if (survey.closedAt) return NextResponse.json({ error: 'survey closed' }, { status: 409 });
  if (archived) return NextResponse.json({ error: 'project finished' }, { status: 409 });
  /* Checked here and not only on the page: a tab opened before the date passed
     is still open after it, and a draft saving into a survey the link no longer
     serves is work nobody will ever see. */
  if (survey.dueAt && survey.dueAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'past the date' }, { status: 409 });
  }

  await db
    .insert(surveyDrafts)
    .values({
      surveyId: survey.id,
      draftKey: body.key,
      step: body.step ?? 0,
      values: body.values ?? {},
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [surveyDrafts.surveyId, surveyDrafts.draftKey],
      set: {
        step: body.step ?? 0,
        values: body.values ?? {},
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
