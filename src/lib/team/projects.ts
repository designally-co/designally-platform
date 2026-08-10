import { and, count, desc, eq, inArray, max } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  clients,
  projects,
  responses,
  surveys,
  users,
  STAGE_FLOW,
  type Package,
} from '@/lib/db/schema';

/** Days of silence before the app suggests closing. It only suggests. */
export const QUIET_LIMIT = 5;

/** The team works in Bangkok; dates are theirs, not the server's. */
const TZ = 'Asia/Bangkok';

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

/**
 * Whether a respondent claimed final decision authority. The identity block's
 * third question offers "Yes — …", "Shared — …" and "No — …"; only the first
 * is a named decision maker. Shared authority is real and is not the same
 * thing, so it counts as nobody named — which is what the kick-off needs to
 * know (docs/insight-engine-spec.md flags a missing decision maker first).
 */
export function claimsDecision(answer: string | null) {
  return typeof answer === 'string' && answer.trim().toLowerCase().startsWith('yes');
}

export type Person = { name: string; role: string | null; decides: boolean };

export type ProjectAction = {
  /** what the button does */
  kind: 'close-collection';
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
  stage: number;
  flow: readonly string[];
  archived: boolean;
  archivedOn: string | null;
  archivedByName: string | null;

  surveyId: string | null;
  token: string | null;
  sentOn: string | null;
  closedOn: string | null;
  closedByName: string | null;

  answers: number;
  lastAnswerOn: string | null;
  quietDays: number | null;
  people: Person[];
  decidedBy: string | null;

  action: ProjectAction | null;
  /** the two lines of the Latest column */
  latest: [string, string];
};

export const PACKAGE_LABEL: Record<Package, string> = {
  branding: 'Branding',
  website: 'Website',
  both: 'Branding + Website',
};

function buildAction(v: {
  closedOn: string | null;
  answers: number;
  quietDays: number | null;
  sentOn: string | null;
}): ProjectAction | null {
  /**
   * Milestone 2 can reach one of these. Reviewing a brief, recording decisions
   * and sending the content survey arrive in milestones 3, 4 and 5 — they are
   * not stubbed here, because a button that does nothing is worse than no
   * button.
   */
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
    return [`Closed with ${plural(v.answers, 'answer')}`, 'kick-off not booked'];
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
          surveyId: responses.surveyId,
          name: responses.respondentName,
          role: responses.role,
          decisionMaker: responses.decisionMaker,
          submittedAt: responses.submittedAt,
        })
        .from(responses)
        .orderBy(responses.submittedAt)
    : [];

  const peopleBySurvey = new Map<string, Person[]>();
  for (const r of everyone) {
    const list = peopleBySurvey.get(r.surveyId) ?? [];
    list.push({ name: r.name, role: r.role, decides: claimsDecision(r.decisionMaker) });
    peopleBySurvey.set(r.surveyId, list);
  }

  /* who acted on the gates */
  const actorIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.project.archivedBy, r.survey?.closedBy])
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

    const people = survey ? (peopleBySurvey.get(survey.id) ?? []) : [];
    const decider = people.find((p) => p.decides) ?? null;

    return {
      id: project.id,
      clientName: client.name,
      projectCode: client.projectCode,
      package: project.package,
      packageLabel: PACKAGE_LABEL[project.package],
      stage: project.stage,
      flow: STAGE_FLOW[project.package],
      archived: project.archived,
      archivedOn: formatDay(project.archivedAt),
      archivedByName: project.archivedBy ? (actorName.get(project.archivedBy) ?? null) : null,

      surveyId: survey?.id ?? null,
      token: survey?.token ?? null,
      sentOn,
      closedOn,
      closedByName: survey?.closedBy ? (actorName.get(survey.closedBy) ?? null) : null,

      answers,
      lastAnswerOn: formatDay(lastAnswer),
      quietDays,
      people,
      decidedBy: decider?.name ?? null,

      action: buildAction({ closedOn, answers, quietDays, sentOn }),
      latest: buildLatest({ sentOn, closedOn, answers, quietDays }),
    };
  });
}
