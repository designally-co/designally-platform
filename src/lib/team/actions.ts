'use server';

import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import {
  briefs,
  clients,
  projects,
  questionBlocks,
  questions,
  surveys,
  PACKAGES,
  type Package,
} from '@/lib/db/schema';
import { CURRENT_QUESTION_VERSION, PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { makeToken } from '@/lib/survey/token';
import { packageLabel } from '@/lib/team/labels';

/**
 * Every gate records who acted. That is rule 2, and it is enforced here rather
 * than in the form: an action with no signed-in user does not run.
 */
async function actingUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not signed in.');
  return session.user.id;
}

export type ActionResult =
  | { ok: true; link?: string; warning?: string }
  | { ok: false; error: string };

/** Stage indices into STAGE_FLOW — the same for every package at this end. */
const STAGE_SURVEY = 2;
const STAGE_ANALYSIS = 3;

export async function createSurvey(formData: FormData): Promise<ActionResult> {
  await actingUser();

  const raw = String(formData.get('client') ?? '').trim();
  const pkg = String(formData.get('package') ?? '') as Package;

  if (!raw) return { ok: false, error: 'Enter a client name · กรุณาใส่ชื่อลูกค้า' };
  if (!PACKAGES.includes(pkg)) return { ok: false, error: 'Choose a package' };

  /* "ACME Coffee — ACME-2026-01" — the code is optional */
  const [namePart, ...codeParts] = raw.split(/[—–]/);
  const name = namePart.trim();
  const projectCode = codeParts.join('—').trim() || null;
  if (!name) return { ok: false, error: 'Enter a client name · กรุณาใส่ชื่อลูกค้า' };

  const db = await getDb();

  /**
   * Refuse to issue a link to a questionnaire that is not in the database.
   *
   * This shipped once: the code moved to question version 2 before the version-2
   * questions were imported, so surveys were created asking for a version that
   * did not exist. The client saw a welcome screen offering nothing and a
   * thank-you a tap later. Checking here means a broken link cannot leave the
   * building, rather than being caught by whoever opens it.
   */
  const blockKeys = [...PACKAGE_BLOCKS[pkg]];
  const [available] = await db
    .select({ n: count() })
    .from(questions)
    .innerJoin(questionBlocks, eq(questionBlocks.id, questions.blockId))
    .where(
      and(
        eq(questions.version, CURRENT_QUESTION_VERSION),
        inArray(questionBlocks.key, blockKeys),
      ),
    );

  if (!available || available.n === 0) {
    return {
      ok: false,
      error:
        `No questions are loaded for version ${CURRENT_QUESTION_VERSION}. The survey was not ` +
        `created, because the link would have opened an empty questionnaire. Run \`npm run db:seed\`.`,
    };
  }

  const [client] = await db.insert(clients).values({ name, projectCode }).returning();
  const [project] = await db
    .insert(projects)
    .values({ clientId: client.id, package: pkg, stage: STAGE_SURVEY })
    .returning();

  const [survey] = await db
    .insert(surveys)
    .values({
      projectId: project.id,
      kind: 'discovery',
      token: makeToken(),
      /* Rule 5 — frozen now. Editing a template later cannot reach this survey. */
      questionVersion: CURRENT_QUESTION_VERSION,
      blockKeys,
    })
    .returning();

  revalidatePath('/');
  return { ok: true, link: `/s/${survey.token}` };
}

/**
 * Gate 1 — close collection. Only a person knows whether four answers from the
 * right people beat ten from the wrong ones. Nothing closes on a timer; the app
 * only ever asks.
 */
export async function closeCollection(surveyId: string): Promise<ActionResult> {
  const userId = await actingUser();
  const db = await getDb();

  const [survey] = await db
    .update(surveys)
    .set({ closedAt: new Date(), closedBy: userId })
    // already-closed surveys are left alone, so closedBy always names the
    // person who actually made the call
    .where(and(eq(surveys.id, surveyId), isNull(surveys.closedAt)))
    .returning();

  if (!survey) return { ok: false, error: 'That survey is already closed.' };

  await db
    .update(projects)
    .set({ stage: STAGE_ANALYSIS })
    .where(eq(projects.id, survey.projectId));

  /**
   * The close is committed before the analysis runs, and separately from it.
   * The gate is the human act — it must survive the analysis failing, the API
   * being down, or the key being unset. A failed brief leaves a closed survey
   * that can be analysed again; it never silently un-closes.
   */
  const [client] = await db
    .select({ name: clients.name, package: projects.package })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, survey.projectId))
    .limit(1);

  const { buildTranscript } = await import('@/lib/analysis/transcript');
  const { analyse } = await import('@/lib/analysis/run');

  const { transcript, respondentCount, decisionMakers } = await buildTranscript(survey.id);

  if (respondentCount === 0) {
    revalidatePath('/');
    return {
      ok: true,
      warning: 'Collection is closed. Nobody answered, so there is nothing to analyse.',
    };
  }

  const result = await analyse({
    clientName: client.name,
    packageLabel: packageLabel(client.package),
    respondentCount,
    transcript,
    decisionMakers,
  });

  if (!result.ok) {
    revalidatePath('/');
    return { ok: true, warning: `Collection is closed, but the brief was not written. ${result.error}` };
  }

  await db.insert(briefs).values({
    projectId: survey.projectId,
    content: result.brief,
  });

  revalidatePath('/');
  return { ok: true };
}

/**
 * Runs the analysis again on an already-closed survey — after a failure, or
 * after the prompt changed. Each run stores a new brief rather than
 * overwriting: a confirmed brief is a record of what a person approved, and
 * replacing it in place would rewrite that record.
 */
export async function reanalyse(projectId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .select({ survey: surveys, clientName: clients.name, package: projects.package })
    .from(surveys)
    .innerJoin(projects, eq(surveys.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(surveys.projectId, projectId), eq(surveys.kind, 'discovery')))
    .limit(1);

  if (!row) return { ok: false, error: 'No survey on this project.' };
  if (!row.survey.closedAt) {
    return { ok: false, error: 'Close collection first — the analysis reads a closed survey.' };
  }

  const { buildTranscript } = await import('@/lib/analysis/transcript');
  const { analyse } = await import('@/lib/analysis/run');

  const { transcript, respondentCount, decisionMakers } = await buildTranscript(row.survey.id);
  if (respondentCount === 0) return { ok: false, error: 'Nobody answered this survey.' };

  const result = await analyse({
    clientName: row.clientName,
    packageLabel: packageLabel(row.package),
    respondentCount,
    transcript,
    decisionMakers,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await db.insert(briefs).values({ projectId, content: result.brief });

  revalidatePath('/');
  return { ok: true };
}

/**
 * Gate 4 — archive. Manual, always available, never automatic. Nothing is
 * deleted; an archived project stays searchable.
 */
export async function archiveProject(projectId: string): Promise<ActionResult> {
  const userId = await actingUser();
  const db = await getDb();

  const [row] = await db
    .update(projects)
    .set({ archived: true, archivedAt: new Date(), archivedBy: userId })
    .where(and(eq(projects.id, projectId), eq(projects.archived, false)))
    .returning();

  if (!row) return { ok: false, error: 'That project is already archived.' };

  revalidatePath('/');
  return { ok: true };
}

/** Archiving is reversible — it is a filing decision, not a deletion. */
export async function restoreProject(projectId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  await db
    .update(projects)
    .set({ archived: false, archivedAt: null, archivedBy: null })
    .where(eq(projects.id, projectId));

  revalidatePath('/');
  return { ok: true };
}
