'use server';

import { and, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth, upsertUser } from '@/auth';
import { getDb } from '@/lib/db';
import {
  PACKAGES,
  answers,
  insights,
  clients,
  projects,
  questionBlocks,
  questions,
  responses,
  surveys,
  users,
  type Package,
} from '@/lib/db/schema';
import { surveyOrigin } from '@/lib/survey/origin';
import { CURRENT_QUESTION_VERSION, PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { makeToken } from '@/lib/survey/token';
import { packageLabel } from '@/lib/team/labels';
import { dayIn, defaultDueDay, endOfDay } from '@/lib/team/due';

/**
 * Every gate records who acted. That is rule 2, and it is enforced here rather
 * than in the form: an action with no signed-in user does not run.
 *
 * **The id is checked against the table, not taken on the session's word.** It
 * arrives from a JWT, which is minted once at sign-in and then believed for
 * thirty days — so it is a claim about a row that existed when somebody signed
 * in, and nothing keeps that row alive. Point the app at a restored backup, at
 * a different Neon branch, or at a reseeded local database, and every id in
 * every live session names a user that is gone.
 *
 * That is not hypothetical and it is not cosmetic. `closed_by`, `archived_by`
 * and `confirmed_by` are foreign keys, so the three human gates are exactly the
 * actions that fail — and they fail as `23503` out of the driver, which reaches
 * the team as an unexplained crash on the button rather than as anything they
 * could act on. Everything that writes no `*_by` carries on working, which is
 * what makes it look like a bug in the gates.
 *
 * So the row is looked up, and rebuilt from the session's own email if it has
 * gone. The email is the identity Google vouched for and `upsertUser` is
 * idempotent, so this restores the same person rather than inventing one. One
 * indexed lookup per gate, against three gates a person presses a handful of
 * times a week.
 */
async function actingUser() {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) throw new Error('Not signed in.');

  const db = await getDb();
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (row) return row.id;

  return upsertUser(email, session.user?.name ?? '');
}

export type ActionResult =
  | { ok: true; link?: string; warning?: string }
  | { ok: false; error: string };

export async function createSurvey(formData: FormData): Promise<ActionResult> {
  await actingUser();

  const raw = String(formData.get('client') ?? '').trim();
  const pkg = String(formData.get('package') ?? '') as Package;

  if (!raw) return { ok: false, error: 'Enter a client name.' };
  if (!PACKAGES.includes(pkg)) return { ok: false, error: 'Choose a package' };

  /**
   * The date the team is telling the client to answer by. The sheet prefills
   * two weeks and the team can change it there, which is where the decision
   * belongs — a survey sent in the week before a shutdown does not want the
   * same date as one sent in a quiet month, and editing it afterwards on the
   * project meant the link was already copied and sent by then.
   *
   * Clearing the field is allowed and means no date: the client is shown none
   * and the prompt never fires, which is how every survey sent before the
   * field existed already behaves.
   */
  const dueRaw = formData.get('due');
  const dueDay = dueRaw === null ? defaultDueDay() : String(dueRaw).trim();
  let dueAt: Date | null = null;
  if (dueDay) {
    dueAt = endOfDay(dueDay);
    if (Number.isNaN(dueAt.getTime())) return { ok: false, error: 'That is not a date.' };
    /* A date already gone is a slip, not an intention — it would put the
       project into Needs you the moment the link was copied. */
    if (dueDay < dayIn(new Date())) {
      return { ok: false, error: 'That date has already passed. Pick a later one.' };
    }
  }

  /**
   * The whole of what was typed is the client's name.
   *
   * This field asked for "Client and project code" and split on an em dash, so
   * "ACME Coffee — ACME-2026-01" stored a name and a code. The code was shown
   * in exactly one place, was never searched, filtered or exported, and named
   * nothing the app knows about — projects have ids and surveys have tokens.
   * Retired 18 August 2026.
   *
   * Dropping the split is the part that matters. A client called "Sea — Land"
   * or "ธนวัฒน์ — ดีไซน์" was silently cut in half at the dash and filed under
   * the first word of their own name, which is the kind of defect nobody
   * reports because it looks like a typo they made.
   *
   * `clients.project_code` is retired in place, like `projects.stage` before
   * it: never written, never read, never dropped. Rows already carrying one
   * keep it.
   */
  const name = raw.trim();
  if (!name) return { ok: false, error: 'Enter a client name.' };

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

  const [client] = await db.insert(clients).values({ name }).returning();
  const [project] = await db
    .insert(projects)
    .values({ clientId: client.id, package: pkg })
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
      /* The date the client is shown and the team is prompted by. It closes
         nothing on its own (rule 1), and stays editable on the project. */
      dueAt,
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
 * see the insights without an outlier or a duplicate submission, not as a routine
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

  /**
   * The close is committed before the analysis runs, and separately from it.
   * The gate is the human act — it must survive the analysis failing, the API
   * being down, or the key being unset. A failed insights leaves a closed survey
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
    return { ok: true, warning: `Collection is closed, but the insights were not written. ${result.error}` };
  }

  await db.insert(insights).values({
    sources,
    projectId: survey.projectId,
    content: result.insights,
  });

  revalidatePath('/');
  return { ok: true };
}

/**
 * Runs the analysis again on an already-closed survey — after a failure, or
 * after the prompt changed. Each run stores a new insights rather than
 * overwriting: a confirmed insights are a record of what a person approved, and
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

  /* A confirmed insights are not replaced by a new run — it keeps its signature and
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

  await db.insert(insights).values({ projectId, content: result.insights, sources });

  revalidatePath('/');
  return { ok: true };
}

/**
 * Gate 2 — confirm the insights.
 *
 * Rule 6: nothing reaches a client before a human confirms it. Rule 2: the gate
 * records who acted. Rule 1: it is never on a timer — insights sits unconfirmed
 * for as long as it takes, and the Needs You list keeps saying so.
 *
 * **The newest insights, not any insights.** Re-analysing inserts a new row and keeps
 * the earlier runs, so confirming by project id alone could sign off insights
 * that was superseded before anyone read it.
 *
 * The `isNull` in the update is not decoration: two people opening the same
 * insights and pressing at the same moment would otherwise both write, and the
 * second would overwrite the first person's name on a gate whose entire purpose
 * is recording who acted.
 */
export async function confirmInsights(projectId: string): Promise<ActionResult> {
  const userId = await actingUser();
  const db = await getDb();

  const [latest] = await db
    .select()
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.generatedAt))
    .limit(1);

  if (!latest) return { ok: false, error: 'There is no insights to confirm.' };
  if (latest.confirmedAt) return { ok: false, error: 'Those insights are already confirmed.' };

  const [row] = await db
    .update(insights)
    .set({ confirmedAt: new Date(), confirmedBy: userId })
    .where(and(eq(insights.id, latest.id), isNull(insights.confirmedAt)))
    .returning();

  if (!row) return { ok: false, error: 'Somebody else confirmed it a moment ago.' };

  revalidatePath('/');
  return { ok: true };
}

/**
 * Gate 4 — archive. Manual, always available, never automatic. Nothing is
 * deleted; an archived project stays searchable.
 *
 * **An open survey is closed on the way, and the close is signed.** Archiving
 * already stopped the client answering — `/s/<token>` refuses an archived
 * project's link and says the work is finished, which `load.ts` has done all
 * along. What it did not do was write it down: the survey kept `closed_at`
 * null, so the project's own record said collection was never closed and
 * nobody ever closed it, which is rule 2 losing a gate rather than recording
 * one. The person archiving is the person who decided to stop taking answers,
 * so they sign both.
 *
 * The date is untouched, and deliberately. `due_at` is what the client was told
 * (rule 1) and archiving before it is the ordinary case — a team that has what
 * it needs does not wait out a date it chose. Moving the date to make the close
 * look punctual would falsify what the client was asked.
 *
 * **It closes and does not analyse.** Closing through gate 1 runs the insights;
 * this does not. Archiving is filing, the answers have already been read by
 * then, and a paid API call fired by a menu item nobody associates with one is
 * a surprise in the wrong direction. `reanalyse` is there if it is wanted.
 */
export async function archiveProject(projectId: string): Promise<ActionResult> {
  const userId = await actingUser();
  const db = await getDb();
  const now = new Date();

  const [row] = await db
    .update(projects)
    .set({ archived: true, archivedAt: now, archivedBy: userId })
    .where(and(eq(projects.id, projectId), eq(projects.archived, false)))
    .returning();

  if (!row) return { ok: false, error: 'That project is already archived.' };

  /* After the archive, not before: if the archive is the one that loses the
     race and returns nothing, the survey must be left as it was. Same guard as
     gate 1 — `closed_at is null` — so a survey closed properly last week keeps
     the name of whoever closed it. */
  const closedNow = await db
    .update(surveys)
    .set({ closedAt: now, closedBy: userId })
    .where(and(eq(surveys.projectId, projectId), isNull(surveys.closedAt)))
    /* bare, not a projection: `getDb` returns a union of the PGlite and
       postgres-js builders and a union's overloads do not compose */
    .returning();

  revalidatePath('/');
  return closedNow.length
    ? { ok: true, warning: 'Archived, and collection is closed. The link now tells anyone opening it that the work is finished.' }
    : { ok: true };
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
 * closing was, and it leaves the insights alone: what was analysed from the
 * answers of the time stays true about the answers of the time.
 *
 * It does clear who closed the survey, because the survey is no longer closed
 * and there is nowhere else to keep that. Re-closing records the actor again.
 * An events table would hold the whole sequence; there isn't one, and inventing
 * it for this would be building the audit log before the audit.
 */
/**
 * Change the date the team asked for answers by.
 *
 * It closes nothing (rule 1) — it is what the client is shown and what puts the
 * project into Needs you once it passes. Clearing it is allowed and means "no
 * date", which is how every survey sent before this existed behaves.
 *
 * Stored at the end of the chosen day in Bangkok rather than at midnight UTC:
 * a client answering on the afternoon of the 31st in Thailand has met a date
 * that says the 31st, and would not have under a UTC midnight.
 */
export async function setDueDate(projectId: string, day: string | null): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  let dueAt: Date | null = null;
  if (day) {
    dueAt = endOfDay(day);
    if (Number.isNaN(dueAt.getTime())) return { ok: false, error: 'That is not a date.' };
  }

  const [row] = await db
    .update(surveys)
    .set({ dueAt })
    .where(eq(surveys.projectId, projectId))
    .returning();

  if (!row) return { ok: false, error: 'That project has no survey.' };

  revalidatePath('/');
  return { ok: true };
}

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
 * Deleting insights somebody signed takes two deliberate steps, and this is the
 * first: a signature should not disappear because a delete button was next to
 * the wrong row. It is also what makes a wrong insights fixable — permanence and
 * correctability pull against each other and this is where the line landed.
 */
export async function unconfirmInsights(insightsId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .update(insights)
    .set({ confirmedAt: null, confirmedBy: null })
    .where(eq(insights.id, insightsId))
    .returning();

  if (!row) return { ok: false, error: 'No such insights.' };

  revalidatePath('/');
  return { ok: true };
}

/** A version nobody has signed. Confirmed ones must be un-confirmed first. */
export async function deleteInsights(insightsId: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .delete(insights)
    .where(and(eq(insights.id, insightsId), isNull(insights.confirmedAt)))
    .returning();

  if (!row) {
    return { ok: false, error: 'That version is confirmed. Un-confirm it first, then delete it.' };
  }

  revalidatePath('/');
  return { ok: true };
}

/** An older version's content, fetched when somebody opens it. */
export async function readInsightsVersion(insightsId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const db = await getDb();
  const [row] = await db.select().from(insights).where(eq(insights.id, insightsId)).limit(1);
  return row ? (row.content as import('@/lib/analysis/schema').Insights) : null;
}

/**
 * Delete one client's response.
 *
 * Two presses when a confirmed insights were built from it. The first reports what
 * would go — deleting the evidence under work somebody has signed their name to
 * should not happen because a Delete button was next to the wrong row. The
 * insights keep their snapshotted source names either way, so what it says stays
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
      await db.select().from(insights).where(eq(insights.projectId, survey.projectId))
    ).filter((b) => b.confirmedAt && b.sources?.some((x) => x.id === responseId));

    if (signed.length) {
      return {
        ok: false,
        error:
          `${row.respondentName}'s answers were read by a confirmed insights. ` +
          `Deleting them leaves that insights citing somebody whose answers are gone. Press again to delete.`,
      };
    }
  }

  await db.delete(answers).where(eq(answers.responseId, responseId));
  await db.delete(responses).where(eq(responses.id, responseId));

  revalidatePath('/');
  return { ok: true };
}

/**
 * The survey link as a QR code, drawn on demand.
 *
 * A server action rather than a client import: `qrcode` is around 50KB and the
 * share panel is opened for a fraction of the projects a team looks at, so
 * putting the encoder in the bundle charges every page load for a thing most of
 * them never draw.
 *
 * SVG rather than a raster. It is what a design studio wants — it scales to a
 * printed card or a slide with no second export at a bigger size — and it makes
 * "save" a file the browser already has rather than a canvas to rasterise.
 *
 * Error correction M, which is the level that survives a QR being printed small
 * or photographed at an angle without inflating the module count: this URL
 * lands at 29 modules, and a client scanning it is doing so on a phone, once.
 *
 * The action returns the *whole* SVG rather than the URL it encodes, because
 * the URL is already on screen beside it — this exists to be looked at with a
 * camera, not read.
 */
export async function surveyQr(token: string): Promise<{ svg: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.' };

  /* The token is the whole authorisation a survey link carries, so it is worth
     being certain this one exists rather than drawing a code for anything a
     caller sends. */
  const db = await getDb();
  const [row] = await db.select({ id: surveys.id }).from(surveys).where(eq(surveys.token, token)).limit(1);
  if (!row) return { error: 'No survey with that link.' };

  const { default: QRCode } = await import('qrcode');
  const svg = await QRCode.toString(`${await surveyOrigin()}/s/${token}`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    /* no quiet zone from the encoder — the panel gives it padding, and a
       margin baked into the file is a margin somebody has to crop out */
    margin: 0,
  });
  return { svg };
}

/**
 * Delete a project and everything under it. There is no undo.
 *
 * Archiving is the filing decision and stays the ordinary one — it is
 * reversible and it keeps the answers, which is why it is what the sheet
 * offers first. This is for the other case: a test project, a duplicate, a
 * client that never signed. Those accumulate in a list the team is supposed to
 * be able to read at a glance, and archiving them only moves them somewhere
 * they still are.
 *
 * **The confirmation is the client's name, typed.** Everything else destructive
 * here is one press inside a panel, and that is proportional to deleting one
 * response — a mistake costs one person's twenty minutes and the button says
 * whose. This costs every response on the project and the insights written from
 * them, and a panel you can clear by pressing twice in the same second is not
 * proportional to that.
 *
 * Checked here as well as in the browser, and the two must stay together: the
 * field is what makes this a check rather than a ceremony. Drop the field and
 * the caller supplies the same string the server compares against, so it passes
 * every time — including the time somebody meant to press Archive. It was
 * briefly like that on 18 August 2026 and is not.
 *
 * The cascade is the database's, declared on the foreign keys: surveys and
 * insights reference the project, responses reference the survey, answers
 * reference the response. Deleting the project row takes all of it. The client
 * is left — one client can have several projects, and deleting the last of them
 * is not a decision to remove the client.
 */
export async function deleteProject(projectId: string, typedName: string): Promise<ActionResult> {
  await actingUser();
  const db = await getDb();

  const [row] = await db
    .select({ id: projects.id, client: clients.name })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) return { ok: false, error: 'That project no longer exists.' };

  /* Trimmed and case-insensitive: a guard against acting without meaning to,
     not a spelling test, and the names are often Thai where a trailing space is
     invisible. */
  if (typedName.trim().toLocaleLowerCase() !== row.client.trim().toLocaleLowerCase()) {
    return { ok: false, error: `That does not match. Type ${row.client} exactly to delete it.` };
  }

  /**
   * No close first, and that is not the omission it looks like beside archive.
   *
   * Archiving closes the survey because the survey survives it and would
   * otherwise carry an unsigned gate 1 for good. Here every `on delete cascade`
   * in the schema fires — surveys, responses, answers, insights — so there is no
   * row left to stamp and nothing left to read a stamp from. Writing `closed_by`
   * a millisecond before deleting the row it sits on records nothing.
   *
   * The link stops working either way, and harder: `/s/<token>` finds no survey
   * at all, so it is a 404 rather than the "this work is finished" page an
   * archived project shows. That is the honest answer — the project it belonged
   * to is gone, and there is nothing to tell the client about.
   */
  await db.delete(projects).where(eq(projects.id, projectId));

  revalidatePath('/');
  return { ok: true };
}
