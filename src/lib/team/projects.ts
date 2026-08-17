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

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function daysBetween(from: Date, to = new Date()) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function agoText(days: number) {
  if (days === 0) return 'today';
  return `${plural(days, 'day')} ago`;
}

export type Person = {
  id: string;
  name: string;
  email: string | null;
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
  projectCode: string | null;
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
  insightsConfirmedOn: string | null;
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
    confirmedOn: string | null;
    confirmedBy: string | null;
    isNewest: boolean;
    /** whose answers it read — null on insights written before that was stored */
    sources: { id: string; name: string }[] | null;
  }[];
  /**
   * Insights were confirmed, and answers arrived afterwards.
   *
   * Reopening collection leaves a confirmed insights alone — its signature stays
   * valid for the answers it was written from. What it cannot do is stay the
   * whole truth, and somebody working from it would never know.
   */
  insightsStale: boolean;
  /** gate 2 records who acted, and a gate whose actor is not shown records nothing useful */
  insightsConfirmedBy: string | null;

  action: ProjectAction | null;
  /** the two lines of the Latest column */
  latest: [string, string];
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
  insightsConfirmedOn: string | null;
  conflicts: number;
}): ProjectAction | null {
  /* Collection was closed but no insights came back — the analysis failed, the
     key was missing, or the request ran past the function's time limit. The
     work is recoverable and the team needs a way to ask for it again. Without
     this the project falls out of Needs you entirely and looks finished. */
  if (v.closedOn && !v.hasInsights && v.answers > 0) {
    return {
      kind: 'write-insights',
      say: `Collection is closed with ${plural(v.answers, 'answer')}, but no insights were written.`,
      emphasis: 'The analysis did not finish.',
      when: `Closed ${v.closedOn}`,
      label: 'Write the insights',
    };
  }

  /* Insights exist and nobody has read it. This is the only step in the flow
     that cannot be skipped — the AI mistakes two wordings of one idea for a
     disagreement, especially across Thai and English. */
  if (v.hasInsights && !v.insightsConfirmedOn) {
    const found =
      v.conflicts === 0
        ? 'It found no conflicts.'
        : `It found ${plural(v.conflicts, 'conflict')}.`;
    return {
      kind: 'review-insights',
      say: `The survey is closed and the analysis is written.`,
      emphasis: found,
      when: v.closedOn
        ? `Closed ${v.closedOn} with ${plural(v.answers, 'answer')}`
        : plural(v.answers, 'answer'),
      label: 'Review insights',
    };
  }

  /**
   * The date the team asked for answers by has passed.
   *
   * Ranked above the quiet check because it is the stronger signal: silence
   * might mean people are busy, but a passed date is a commitment the team made
   * to itself. It still only asks — rule 1, and the gate records who closed it.
   * Answers arriving after this are accepted and welcome.
   */
  if (!v.closedOn && v.overdueDays !== null && v.overdueDays > 0) {
    return {
      kind: 'close-collection',
      say:
        v.answers > 0
          ? `${plural(v.answers, 'answer')} in, and the date you asked for has passed.`
          : 'The date you asked for has passed, and nobody has answered.',
      emphasis:
        v.answers > 0 ? 'Close it, or give it longer?' : 'Chase it, or give it longer?',
      when: `Was due ${v.dueOn} · ${agoText(v.overdueDays)}`,
      label: 'Close collection',
    };
  }

  if (!v.closedOn && v.answers > 0 && v.quietDays !== null && v.quietDays >= QUIET_LIMIT) {
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

function buildLatest(v: {
  sentOn: string | null;
  closedOn: string | null;
  answers: number;
  quietDays: number | null;
}): [string, string] {
  if (!v.sentOn) return ['Not sent yet', 'no link issued'];
  if (v.closedOn) {
    return [`Closed with ${plural(v.answers, 'answer')}`, 'insights written'];
  }
  if (v.answers === 0) return [`Sent ${v.sentOn}`, 'no answers yet'];
  return [`Sent ${v.sentOn}`, `last answer ${agoText(v.quietDays ?? 0)}`];
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
    list.push({ id: r.id, name: r.name, email: r.email });
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
          ...(versionsByProject.get(r.project.id) ?? []).map((b) => b.confirmedBy),
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
      projectCode: client.projectCode,
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
      insightsConfirmedOn: formatDay(insightRow?.confirmedAt ?? null),
      insightsConfirmedBy: insightRow?.confirmedBy ? (actorName.get(insightRow.confirmedBy) ?? null) : null,
      insightsVersions: (versionsByProject.get(project.id) ?? []).map((b, i) => ({
        id: b.id,
        writtenOn: formatDay(b.generatedAt) ?? '',
        confirmedOn: formatDay(b.confirmedAt ?? null),
        confirmedBy: b.confirmedBy ? (actorName.get(b.confirmedBy) ?? null) : null,
        isNewest: i === 0,
        sources: b.sources ?? null,
      })),
      /* the confirmed version, not the newest — a newer unconfirmed run does not
         make the signed one stale, more answers do */
      insightsStale: (() => {
        const signed = (versionsByProject.get(project.id) ?? []).find((b) => b.confirmedAt);
        return !!(signed?.confirmedAt && lastAnswer && lastAnswer > signed.confirmedAt);
      })(),

      action: buildAction({
        closedOn,
        answers,
        quietDays,
        sentOn,
        dueOn,
        overdueDays,
        hasInsights: Boolean(insights),
        insightsConfirmedOn: formatDay(insightRow?.confirmedAt ?? null),
        conflicts: insights?.unsettled.length ?? 0,
      }),
      latest: buildLatest({ sentOn, closedOn, answers, quietDays }),
    };
  });
}
