import { and, count, desc, eq, inArray, max } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  clients,
  projects,
  responses,
  surveys,
  users,
  insights,
  type Package,
} from '@/lib/db/schema';

import { PACKAGE_LABEL, packageLabel } from '@/lib/team/labels';
import { DEFAULT_DUE_DAYS, TZ, dayIn } from '@/lib/team/due';
import { plural } from '@/lib/team/words';

export { PACKAGE_LABEL, DEFAULT_DUE_DAYS };

/** Days of silence before the app suggests closing. It only suggests. */
export const QUIET_LIMIT = 5;

export function formatDay(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(date);
}

export function formatToday(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  }).format(new Date());
}

/**
 * "this morning", and only when it is.
 *
 * The greeting has said *"Two things need you this morning"* at every hour
 * since it was written, which on a screen whose whole voice is plain-spoken
 * fact is the one sentence on the page that can be read at 4pm and be wrong.
 *
 * Computed here rather than in the browser, and in Bangkok rather than in the
 * viewer's zone, for the same reason `formatToday` is: the greeting is
 * server-rendered, and an hour read from the client would differ from the one
 * that came down the wire and take the whole page's hydration with it. The
 * team is in Bangkok, which is the zone the rest of this file already assumes.
 */
export function partOfDay(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'this morning';
  if (hour < 17) return 'this afternoon';
  return 'this evening';
}

export { plural };

export function daysBetween(from: Date, to = new Date()) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

/** every space held, so a phrase wraps as one thing or not at all */
function nbsp(text: string) {
  return text.replace(/ /g, '\u00a0');
}

/* `daysUntilDay` went on 20 August 2026 with the countdown it fed. The card
   says the date and nothing else now. */

function agoText(days: number) {
  if (days === 0) return 'today';
  return `${plural(days, 'day')} ago`;
}

export type Person = {
  id: string;
  name: string;
  email: string | null;
  /** raw, not formatted — the browser turns it into a local time, see `when.ts` */
  submittedAt: Date;
};

export type ProjectAction = {
  /** what the button does */
  kind: 'close-collection' | 'review-insights' | 'write-insights';
  say: string;
  emphasis?: string;
  when: string;
  label: string;
};

export type ProjectView = {
  id: string;
  clientName: string;
  package: Package;
  packageLabel: string;
  archived: boolean;
  archivedOn: string | null;
  archivedByName: string | null;

  surveyId: string | null;
  token: string | null;
  sentOn: string | null;
  /** the date the team asked for answers by — shown, never enforced */
  dueOn: string | null;
  /** the same date as YYYY-MM-DD in Bangkok, for the date input to edit */
  dueDay: string | null;
  closedOn: string | null;
  closedByName: string | null;

  answers: number;
  lastAnswerOn: string | null;
  quietDays: number | null;
  people: Person[];
  /** the names in the Answers column — "Khun A" or "Khun A +2" */
  answeredBy: string | null;

  /** the most recent insights, if the analysis has run */
  insights: import('@/lib/analysis/schema').Insights | null;
  insightsWrittenOn: string | null;
  /**
   * Every run, newest first — the content of the newest only.
   *
   * Re-analysing keeps the earlier runs and always did; nothing ever showed
   * them. Carrying every version's content would ship a great deal of text to
   * a browser that will read one, so an older version's content is fetched when
   * somebody opens it.
   */
  insightsVersions: {
    id: string;
    writtenOn: string;
    /** raw, for the bar's date *and time* — formatted in the browser, see `when.ts` */
    writtenAt: Date;
    isNewest: boolean;
    /** whose answers it read — null on insights written before that was stored */
    sources: { id: string; name: string }[] | null;
  }[];

  action: ProjectAction | null;
  /**
   * A project card's two facts: how many answers came back, and when the link
   * shuts. "5 answers" and "closes on 2 Sept".
   *
   * It was `latest: [string, string]`, two cells of a three-column table. The
   * table went on 20 August 2026 because PRODUCT.md names it by name as an
   * anti-reference — "must not resemble a project-management dashboard, a
   * CRM… it needs a short list of sentences" — and a `<thead>` with three
   * column headers is exactly that shape.
   *
   * Two parts rather than one string, because the card draws them as two lines
   * with a mark in front of each. It was one sentence joined by a middot for
   * half a day, and on a 250px tile that wrapped to three lines on some
   * projects and two on others, which is a grid that looks misaligned rather
   * than one that looks full.
   */
  standing: { arrived: string; due: string | null };
};


function buildAction(v: {
  closedOn: string | null;
  answers: number;
  quietDays: number | null;
  sentOn: string | null;
  dueOn: string | null;
  /** days past the date the team asked for; null if no date or not yet due */
  overdueDays: number | null;
  hasInsights: boolean;
  /** an archived project is finished and asks for nothing */
  archived: boolean;
  conflicts: number;
}): ProjectAction | null {
  if (v.archived) return null;

  /**
   * **Closed means no answer is accepted** — confirmed by the team 19 August
   * 2026 — and there are two ways in: somebody pressed Close now, or the date
   * arrived. Every rule below that used to read `closedOn` reads this instead.
   *
   * What it fixed: a survey a week past its date sat in *Needs you* asking to
   * be closed, while its link had been turning clients away the whole time and
   * its answers were sitting unread. `closedOn` goes on meaning only the first
   * of the two, which is the record of who acted — see rule 2.
   */
  const shut = !!v.closedOn || (v.overdueDays !== null && v.overdueDays > 0);

  /* Shut, with answers nobody has analysed. Two ways to arrive and they are not
     the same news: closing runs the analysis on the way, so a closed survey
     with no insights is one where it *failed* — the key was missing, or the
     request ran past the function's time limit. A survey the date closed never
     started one. Both are recoverable and both need a way to ask; only the
     sentence differs. Without this the project falls out of Needs you entirely
     and looks finished. */
  if (shut && !v.hasInsights && v.answers > 0) {
    return {
      kind: 'write-insights',
      say: v.closedOn
        ? `Collection is closed with ${plural(v.answers, 'answer')}, but no insights were written.`
        : `The date has passed with ${plural(v.answers, 'answer')} in.`,
      emphasis: v.closedOn
        ? 'The analysis did not finish.'
        : 'Nobody can answer now. The analysis has not been run.',
      when: v.closedOn ? `Closed ${v.closedOn}` : `Closed ${v.dueOn} · on its date`,
      label: 'Write the insights',
    };
  }

  /**
   * The analysis is written, and the project is waiting to be filed.
   *
   * This used to run while the insights were *unconfirmed*, and confirming is
   * what cleared it. Gate 2 went on 18 August 2026 — the platform's job is to
   * collect the answers and write the insights, and it stops there — so there
   * is no signature to wait for and the condition is simply that an analysis
   * exists.
   *
   * What clears it now is archiving, which is why `archived` returns null at
   * the top of this function. Without that this would be a card nothing could
   * ever answer, which is the one thing a "Needs you" list must not contain:
   * a row that cannot be cleared teaches people to stop reading the list.
   */
  if (v.hasInsights) {
    const found =
      v.conflicts === 0
        ? 'It found no conflicts.'
        : `It found ${plural(v.conflicts, 'conflict')}.`;
    return {
      kind: 'review-insights',
      /**
       * "Closed" only when it is closed.
       *
       * This said "The survey is closed and the analysis is written" whenever
       * insights existed and were unconfirmed, which is not the same condition.
       * Reopening clears `closedAt` and deliberately leaves the insights alone —
       * that is what `reopenCollection` is for — so a reopened project sat here
       * announcing it was closed while its link was live and taking answers.
       * The `when` line below already knew, and fell back to the answer count.
       */
      say: shut
        ? 'The survey is closed and the analysis is written.'
        : 'The analysis is written, and the survey is open again.',
      /* `say` is the bold statement of fact and `emphasis` is what follows from
         it — the same slot the other two cards put their question in. Archiving
         is what clears this row, so it has to be said somewhere a person reads
         before pressing, and putting it in `say` split the sentence from its
         own conflict count. */
      emphasis: `${found} Archive the project once your team has what it needs.`,
      when: shut
        ? `Closed ${v.closedOn ?? v.dueOn} with ${plural(v.answers, 'answer')}`
        : plural(v.answers, 'answer'),
      label: 'Review insights',
    };
  }

  /**
   * Shut, and nobody answered.
   *
   * There is nothing to analyse and nothing to archive with — the only two
   * moves are to reopen it for a while longer or to let the project go. Both
   * are in the sheet, so this asks rather than naming one.
   *
   * It replaces a card that fired only past the date and asked to *close* a
   * survey the date had already closed. A survey a person closed with nobody
   * having answered used to match nothing at all and dropped silently out of
   * the list, which is the same defect from the other side.
   */
  if (shut && v.answers === 0) {
    return {
      kind: 'close-collection',
      say: 'Collection is closed and nobody answered.',
      emphasis: 'Reopen it for longer, or let the project go?',
      when: v.closedOn
        ? `Closed ${v.closedOn}`
        : `Closed ${v.dueOn} · ${agoText(v.overdueDays ?? 0)}`,
      label: 'Open the project',
    };
  }

  if (!shut && v.answers > 0 && v.quietDays !== null && v.quietDays >= QUIET_LIMIT) {
    return {
      kind: 'close-collection',
      say: `${plural(v.answers, 'answer')} in, and it has been quiet for ${plural(v.quietDays, 'day')}.`,
      emphasis: 'Enough to work with, or wait a little longer?',
      when: `Sent ${v.sentOn} · last answer ${agoText(v.quietDays)}`,
      label: 'Close collection',
    };
  }
  return null;
}

/**
 * A project's whole state, in one sentence.
 *
 * Two clauses joined by a middot: what has arrived, and when the link shuts.
 * Commas separate inside a clause and the middot separates clauses, so the
 * line has one reading and not two.
 *
 * **The date is always on it — 20 August 2026, asked for.** It has been the
 * thing that shuts the link since rule 1 settled, and the one place it was
 * never shown was the page a person actually scans; you had to open a project
 * to learn when its survey stops. Surveys sent before the field existed have
 * no date and the clause is simply absent — nothing backfills them, and an
 * invented "no date" would be a fact about the software rather than about the
 * project.
 *
 * **Every live project reaches this line, from 20 August 2026.** It used to
 * describe only the ones with nothing pending — the page had a second list for
 * the rest — so it could assume an open survey and an unreached date. With one
 * list it has to say `closed 18 Aug` as readily as `closes 26 Aug`, and a shut
 * survey drops the recency: "last one 2 days ago" is a fact about a door that
 * is no longer open, and the date it shut is the one that matters.
 *
 * The sent date went with the table. It was only ever read as recency, which
 * the answer clause states directly and in the words a person would use.
 */
function buildStanding(v: {
  sentOn: string | null;
  dueOn: string | null;
  closedOn: string | null;
  /** closed by a person, or past its date — see `buildAction` */
  shut: boolean;
  answers: number;
}): { arrived: string; due: string | null } {
  if (!v.sentOn) return { arrived: 'Not sent yet', due: null };

  /**
   * How many came back, and nothing about when.
   *
   * "5 answers, last one 1 day ago" until 20 August 2026, when the recency went
   * — asked for, along with the countdown that had been running beside the
   * date. Both were true and both were answers to a question the card is not
   * being asked: on a tile scanned in a second, *how many* and *until when* are
   * the two facts, and each extra clause made the line long enough to wrap and
   * the grid uneven with it.
   *
   * Neither is lost. Recency is what puts a project in the notification panel
   * once a survey goes quiet, and the project sheet dates every single answer.
   */
  const arrived =
    v.answers === 0
      ? v.shut
        ? 'No answers'
        : 'No answers yet'
      : plural(v.answers, 'answer');

  /* `closedOn` when a person pressed the button, the date when the date did it.
     Rule 1: the client meets the same screen either way, and so does whoever
     reads this line. */
  /* "closed **on** 18 Aug", with the preposition — asked for, 20 August 2026.
     Without it the verb and the date collide into something that reads as a
     label rather than as a statement: "closes 3 Sept" is a column heading's
     grammar, and this is a sentence on a card. */
  if (v.shut) return { arrived, due: nbsp(`closed on ${v.closedOn ?? v.dueOn}`) };

  return { arrived, due: v.dueOn ? nbsp(`closes on ${v.dueOn}`) : null };
}

export async function loadProjects({ archived = false } = {}): Promise<ProjectView[]> {
  const db = await getDb();

  const rows = await db
    .select({
      project: projects,
      client: clients,
      survey: surveys,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(surveys, and(eq(surveys.projectId, projects.id), eq(surveys.kind, 'discovery')))
    .where(eq(projects.archived, archived))
    .orderBy(desc(projects.createdAt));

  const surveyIds = rows.map((r) => r.survey?.id).filter((id): id is string => Boolean(id));

  /* answer counts and the last arrival, per survey */
  const stats = surveyIds.length
    ? await db
        .select({
          surveyId: responses.surveyId,
          n: count(responses.id),
          last: max(responses.submittedAt),
        })
        .from(responses)
        .groupBy(responses.surveyId)
    : [];
  const statBySurvey = new Map(stats.map((s) => [s.surveyId, s]));

  /* who answered — a handful of people per project by design */
  const everyone = surveyIds.length
    ? await db
        .select({
          id: responses.id,
          surveyId: responses.surveyId,
          name: responses.respondentName,
          email: responses.email,
          submittedAt: responses.submittedAt,
        })
        .from(responses)
        .orderBy(responses.submittedAt)
    : [];

  const peopleBySurvey = new Map<string, Person[]>();
  for (const r of everyone) {
    const list = peopleBySurvey.get(r.surveyId) ?? [];
    list.push({ id: r.id, name: r.name, email: r.email, submittedAt: r.submittedAt });
    peopleBySurvey.set(r.surveyId, list);
  }

  /* the latest insights per project — newest wins; earlier runs are kept */
  const insightRows = rows.length
    ? await db
        .select()
        .from(insights)
        .where(
          inArray(
            insights.projectId,
            rows.map((r) => r.project.id),
          ),
        )
        .orderBy(desc(insights.generatedAt))
    : [];
  const newestByProject = new Map<string, (typeof insightRows)[number]>();
  const versionsByProject = new Map<string, typeof insightRows>();
  for (const b of insightRows) {
    if (!newestByProject.has(b.projectId)) newestByProject.set(b.projectId, b);
    versionsByProject.set(b.projectId, [...(versionsByProject.get(b.projectId) ?? []), b]);
  }

  /* who acted on the gates */
  const actorIds = [
    ...new Set(
      rows
        .flatMap((r) => [
          r.project.archivedBy,
          r.survey?.closedBy,
        ])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const actors = actorIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, actorIds))
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name]));

  return rows.map(({ project, client, survey }) => {
    const stat = survey ? statBySurvey.get(survey.id) : undefined;
    const answers = stat?.n ?? 0;
    const lastAnswer = stat?.last ? new Date(stat.last) : null;

    const sentOn = formatDay(survey?.openedAt ?? null);
    const closedOn = formatDay(survey?.closedAt ?? null);
    const quietDays = survey
      ? daysBetween(lastAnswer ?? survey.openedAt)
      : null;

    const dueOn = formatDay(survey?.dueAt ?? null);
    const dueDay = survey?.dueAt ? dayIn(survey.dueAt) : null;
    /* Days past the date the team asked for. Null when there is no date, or
       when it has not arrived yet — surveys sent before the field existed
       simply never trigger the prompt. */
    const overdueDays =
      survey?.dueAt && survey.dueAt < new Date() ? daysBetween(survey.dueAt) : null;

    const people = survey ? (peopleBySurvey.get(survey.id) ?? []) : [];
    /* DESIGN.md §6 — an empty cell is a defect, so the Answers column names
       who answered now that it no longer names who decides. */
    const answeredBy =
      people.length === 0
        ? null
        : people.length === 1
          ? people[0].name
          : `${people[0].name} +${people.length - 1}`;

    const insightRow = newestByProject.get(project.id) ?? null;
    const insights = (insightRow?.content ?? null) as import('@/lib/analysis/schema').Insights | null;

    return {
      id: project.id,
      clientName: client.name,
      package: project.package,
      packageLabel: packageLabel(project.package),
      archived: project.archived,
      archivedOn: formatDay(project.archivedAt),
      archivedByName: project.archivedBy ? (actorName.get(project.archivedBy) ?? null) : null,

      surveyId: survey?.id ?? null,
      token: survey?.token ?? null,
      sentOn,
      dueOn,
      dueDay,
      closedOn,
      closedByName: survey?.closedBy ? (actorName.get(survey.closedBy) ?? null) : null,

      answers,
      lastAnswerOn: formatDay(lastAnswer),
      quietDays,
      people,
      answeredBy,

      insights,
      insightsWrittenOn: formatDay(insightRow?.generatedAt ?? null),
      insightsVersions: (versionsByProject.get(project.id) ?? []).map((b, i) => ({
        id: b.id,
        writtenOn: formatDay(b.generatedAt) ?? '',
        writtenAt: b.generatedAt,
        isNewest: i === 0,
        sources: b.sources ?? null,
      })),

      action: buildAction({
        closedOn,
        answers,
        quietDays,
        sentOn,
        dueOn,
        overdueDays,
        hasInsights: Boolean(insights),
        archived: project.archived,
        conflicts: insights?.unsettled.length ?? 0,
      }),
      /* The same `shut` both readings of a survey depend on — see rule 1. It is
         derived once here rather than twice, so the sentence and the action can
         never disagree about whether anybody can still answer. */
      standing: buildStanding({
        sentOn,
        dueOn,
        closedOn,
        shut: Boolean(closedOn) || (overdueDays !== null && overdueDays > 0),
        answers,
      }),
    };
  });
}
