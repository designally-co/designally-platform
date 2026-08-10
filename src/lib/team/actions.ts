'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { clients, projects, surveys, PACKAGES, type Package } from '@/lib/db/schema';
import { PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { makeToken } from '@/lib/survey/token';

/**
 * Every gate records who acted. That is rule 2, and it is enforced here rather
 * than in the form: an action with no signed-in user does not run.
 */
async function actingUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Not signed in.');
  return session.user.id;
}

export type ActionResult = { ok: true; link?: string } | { ok: false; error: string };

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
      questionVersion: 1,
      blockKeys: [...PACKAGE_BLOCKS[pkg]],
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
