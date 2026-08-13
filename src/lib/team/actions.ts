'use server';

import { and, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import {
  PACKAGES,
  answers,
  briefs,
  clients,
  projects,
  questionBlocks,
  questions,
  responses,
  surveys,
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
/**
 * `only` names the responses to analyse. Omitted means all of them, which is the
 * default and nearly always what happens — the subset exists so the team can
 * see the brief without an outlier or a duplicate submission, not as a routine
 * step.
 */
export async function closeCollection(surveyId: string, only?: string[]): Promise<ActionResult> {
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

  const { transcript, respondentCount, sources } = await buildTranscript(survey.id, only);

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
  });

  if (!result.ok) {
    revalidatePath('/');
    return { ok: true, warning: `Collection is closed, but the brief was not written. ${result.error}` };
  }

  await db.insert(briefs).values({
    sources,
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
export async function reanalyse(projectId: string, only?: string[]): Promise<ActionResult> {
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

  /* A confirmed brief is not replaced by a new run — it keeps its signature and
     stays in the history, and the new analysis becomes an unconfirmed version
     above it. Nothing is demoted, so nothing needs blocking. */

  const { buildTranscript } = await import('@/lib/analysis/transcript');
  const { analyse } = await import('@/lib/analysis/run');

  const { transcript, respondentCount, sources } = await buildTranscript(row.survey.id, only);
  if (respondentCount === 0) return { ok: false, error: 'Nobody answered this survey.' };

  const result = await analyse({
    clientName: row.clientName,
    packageLabel: packageLabel(row.package),
    respondentCount,
    transcript,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await db.insert(briefs).values({ projectId, content: result.brief, sources });

  revalidatePath('/');
  return { ok: true };
}

/**
 * Gate 2 — confirm the brief.
 *
 * Rule 6: nothing reaches a client before a human confirms it. Rule 2: the gate
 * records who acted. Rule 1: it is never on a timer — a brief sits unconfirmed
 * for as long as it takes, and the Needs You list keeps saying so.
 *
 * **The newest brief, not any brief.** Re-analysing inserts a new row and keeps
 * the earlier runs, so confirming by project id alone could sign off a brief
 * that was superseded before anyone read it.
 *
 * The `isNull` in the update is not decoration: two people opening the same
 * brief and pressing at the same moment would otherwise both write, and the
 * second would overwrite the first person's name on a gate whose entire purpose
 * is recording who acted.
 */
export async function confirmBrief(projectId: string): Promise<ActionResult> {
  const userId = await actingUser();
  const db = await getDb();

  const [latest] = await db
    .select()
    .from(briefs)
    .where(eq(briefs.projectId, projectId))
    .orderBy(desc(briefs.generatedAt))
    .limit(1);

  if (!latest) return { ok: false, error: 'There is no brief to confirm.' };
  if (latest.confirmedAt) return { ok: false, error: 'That brief is already confirmed.' };

  const [row] = await db
    .update(briefs)
    .set({ confirmedAt: new Date(), confirmedBy: userId })
    .where(and(eq(briefs.id, latest.id), isNull(briefs.confirmedAt)))
    .returning();

  if (!row) return { ok: false, error: 'Somebody else confirmed it a moment ago.' };

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

/**
 * Read a project's answers, on demand.
 *
 * Not loaded with the projects list: every answer of every respondent on every
 * live project is a great deal of text to ship to a browser that will show one
 * project's worth, and only when somebody asks.
 */
export async function readAnswers(projectId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const { loadProjectAnswers } = await import('@/lib/team/answers');
  return loadProjectAnswers(projectId);
}

/**
 * Undo gate 1 — take answers again.
 *
 * A stakeholder replying the day after collection closed is not an edge case,
 * and until now the only answer was "too late". Reopening is a human act like
 * closing was, and it leaves the brief alone: what was analysed from the
 * answers of the time stays true about the answers of the time.
 *
 * It does clear who closed the survey, because the survey is no longer closed
 * and there is nowhere else to keep that. Re-closing records the actor again.
 * An events table would hold the whole sequence; there isn't one, and inventing
 * it for this would be building the audit log before the audit.
 */
export async function reopenCollection(projectId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .update(surveys)
    .set({ closedAt: null, closedBy: null })
    /* only a closed survey can be reopened, and the returning row proves it —
       two people pressing at once must not both report success */
    .where(and(eq(surveys.projectId, projectId), isNotNull(surveys.closedAt)))
    .returning();

  if (!row) return { ok: false, error: 'That survey is already open.' };

  revalidatePath('/');
  return { ok: true };
}

/**
 * Undo gate 2.
 *
 * Deleting a brief somebody signed takes two deliberate steps, and this is the
 * first: a signature should not disappear because a delete button was next to
 * the wrong row. It is also what makes a wrong brief fixable — permanence and
 * correctability pull against each other and this is where the line landed.
 */
export async function unconfirmBrief(briefId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .update(briefs)
    .set({ confirmedAt: null, confirmedBy: null })
    .where(eq(briefs.id, briefId))
    .returning();

  if (!row) return { ok: false, error: 'No such brief.' };

  revalidatePath('/');
  return { ok: true };
}

/** A version nobody has signed. Confirmed ones must be un-confirmed first. */
export async function deleteBrief(briefId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .delete(briefs)
    .where(and(eq(briefs.id, briefId), isNull(briefs.confirmedAt)))
    .returning();

  if (!row) {
    return { ok: false, error: 'That version is confirmed. Un-confirm it first, then delete it.' };
  }

  revalidatePath('/');
  return { ok: true };
}

/** An older version's content, fetched when somebody opens it. */
export async function readBriefVersion(briefId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const db = await getDb();
  const [row] = await db.select().from(briefs).where(eq(briefs.id, briefId)).limit(1);
  return row ? (row.content as import('@/lib/analysis/schema').Brief) : null;
}

/**
 * Delete one client's response.
 *
 * Two presses when a confirmed brief was built from it. The first reports what
 * would go — deleting the evidence under work somebody has signed their name to
 * should not happen because a Delete button was next to the wrong row. The
 * brief keeps its snapshotted source names either way, so what it says stays
 * readable after the response is gone.
 *
 * Answers go first: `answers.question_id` has no cascade, and orphaning them
 * would leave rows pointing at a response that no longer exists.
 */
export async function deleteResponse(
  responseId: string,
  confirm?: boolean,
): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db.select().from(responses).where(eq(responses.id, responseId)).limit(1);
  if (!row) return { ok: false, error: 'No such response.' };

  const [survey] = await db.select().from(surveys).where(eq(surveys.id, row.surveyId)).limit(1);
  if (!survey) return { ok: false, error: 'No such survey.' };

  if (!confirm) {
    const signed = (
      await db.select().from(briefs).where(eq(briefs.projectId, survey.projectId))
    ).filter((b) => b.confirmedAt && b.sources?.some((x) => x.id === responseId));

    if (signed.length) {
      return {
        ok: false,
        error:
          `${row.respondentName}'s answers were read by a confirmed brief. ` +
          `Deleting them leaves that brief citing somebody whose answers are gone. Press again to delete.`,
      };
    }
  }

  await db.delete(answers).where(eq(answers.responseId, responseId));
  await db.delete(responses).where(eq(responses.id, responseId));

  revalidatePath('/');
  return { ok: true };
}
