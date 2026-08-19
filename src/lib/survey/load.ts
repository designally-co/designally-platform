import { and, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  clients,
  projects,
  questionBlocks,
  questions,
  surveys,
  type BlockKey,
  type Package,
  type QuestionConfig,
  type QuestionType,
  type SurveyKind,
} from '@/lib/db/schema';
import { stepsFor } from './steps';
import { normaliseToken } from './token';

/** Everything the client needs to render one question. */
export type SurveyQuestion = {
  id: string;
  /** "core.9" — stable across question versions, used as the draft key */
  ref: string;
  blockKey: BlockKey;
  /** the number printed beside the question; identity questions are unnumbered */
  number: number | null;
  textEn: string;
  textTh: string;
  helpEn: string | null;
  helpTh: string | null;
  type: QuestionType;
  config: QuestionConfig;
  required: boolean;
};

export type SurveyStep = {
  /** "Project Information" / "Visual Direction" — absent on the name field */
  sectionEn?: string;
  sectionTh?: string;
  headingEn: string;
  descTh?: string;
  /** set when this step's block is conditional — "website.6" reveals it */
  revealedBy?: string;
  questions: SurveyQuestion[];
};

export type SurveyPayload = {
  token: string;
  kind: SurveyKind;
  clientName: string;
  package: Package;
  closed: boolean;
  /**
   * The project was archived — gate 4.
   *
   * A survey link is meant to be forwarded, and archiving is the team saying
   * the project is finished. Without this the two facts never met: an archived
   * project's link stayed fully open, so answers could arrive months later into
   * a row nobody is watching. Closing collection and archiving are different
   * acts and a team can do either without the other.
   */
  archived: boolean;
  /**
   * The date the team asked for answers by, already formatted for reading.
   *
   * Shown on the welcome and nowhere else. Null on surveys sent before the
   * field existed.
   */
  dueOn: { en: string; th: string } | null;
  /**
   * The date has passed, and the link has stopped taking answers.
   *
   * **Changed 18 August 2026, asked for.** The date used to close nothing: a
   * late answer landed and the project only appeared in *Needs you* asking
   * whether to close. It is a deadline now — a client arriving after it is told
   * the questionnaire is closed and asked to contact the team, who move the date
   * to let them back in.
   *
   * **The data is untouched.** `closed_at` stays null and no `closed_by` is
   * invented; this is the route declining to serve, not the app closing a survey
   * on a timer and signing it as though somebody had. The team's two gates still
   * belong to people. Clearing the date, or moving it forward, opens the link
   * again with nothing to undo.
   */
  overdue: boolean;
  steps: SurveyStep[];
  questionCount: number;
};

export async function loadSurvey(rawToken: string): Promise<SurveyPayload | null> {
  const token = normaliseToken(rawToken);
  const db = await getDb();

  const [row] = await db
    .select({
      survey: surveys,
      project: projects,
      client: clients,
    })
    .from(surveys)
    .innerJoin(projects, eq(surveys.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(surveys.token, token))
    .limit(1);

  if (!row) return null;

  const blockKeys = row.survey.blockKeys as BlockKey[];

  const blocks = await db
    .select()
    .from(questionBlocks)
    .where(inArray(questionBlocks.key, blockKeys));

  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const blockByKey = new Map(blocks.map((b) => [b.key, b]));

  /* Rule 5 — the version frozen at send, not whatever the template says now. */
  const rows = blocks.length
    ? await db
        .select()
        .from(questions)
        .where(
          and(
            inArray(
              questions.blockId,
              blocks.map((b) => b.id),
            ),
            eq(questions.version, row.survey.questionVersion),
          ),
        )
    : [];

  const byRef = new Map<string, (typeof rows)[number]>();
  const ordersByBlock: Record<string, number[]> = {};
  for (const q of rows) {
    const key = blockById.get(q.blockId)!.key;
    byRef.set(`${key}.${q.order}`, q);
    (ordersByBlock[key] ??= []).push(q.order);
  }
  for (const key of Object.keys(ordersByBlock)) ordersByBlock[key].sort((a, b) => a - b);

  const blockNames = Object.fromEntries(
    blocks.map((b) => [b.key, { nameEn: b.nameEn, introEn: b.introEn, introTh: b.introTh }]),
  );

  const defs = stepsFor(
    row.survey.kind,
    row.project.package,
    blockKeys,
    ordersByBlock,
    blockNames,
  );

  /* Which questions can reveal a conditional block — declared in the seed as
     `triggers` on a choice, never inferred. */
  const revealedBy = new Map<BlockKey, string>();
  for (const [ref, q] of byRef) {
    const triggers = (q.config as QuestionConfig).triggers;
    if (!triggers) continue;
    for (const target of Object.values(triggers)) revealedBy.set(target as BlockKey, ref);
  }

  let counter = 0;
  const steps: SurveyStep[] = [];

  for (const def of defs) {
    const stepQuestions: SurveyQuestion[] = [];
    for (const ref of def.questions) {
      const q = byRef.get(ref);
      if (!q) continue; // a block the package does not attach, or a removed question
      const blockKey = blockById.get(q.blockId)!.key;
      stepQuestions.push({
        id: q.id,
        ref,
        blockKey,
        number: blockKey === 'identity' ? null : ++counter,
        textEn: q.textEn,
        textTh: q.textTh,
        helpEn: q.helpEn,
        helpTh: q.helpTh,
        type: q.type,
        config: q.config as QuestionConfig,
        required: q.required,
      });
    }
    if (!stepQuestions.length) continue;

    const stepBlocks = new Set(stepQuestions.map((q) => q.blockKey));
    const conditional = [...stepBlocks].find((k) => blockByKey.get(k)?.shownWhen);

    steps.push({
      ...def,
      revealedBy: conditional ? revealedBy.get(conditional) : undefined,
      questions: stepQuestions,
    });
  }

  return {
    token: row.survey.token,
    kind: row.survey.kind,
    clientName: row.client.name,
    package: row.project.package,
    closed: row.survey.closedAt !== null,
    /**
     * Formatted in both languages, not once in English and reused.
     *
     * A Thai sentence ending in "31 August" is the same defect as an English
     * one ending in a Thai month: the line is bilingual, so the date inside it
     * has to be too. The welcome screen is English from 19 August 2026 but the
     * closed screen is not, and both read this.
     *
     * Bangkok in both, because the client reads it there and a date is not a
     * moment — the 31st must not become the 30th because a server sits in
     * Virginia.
     *
     * **`en-US` and the year, from 19 August 2026** — "September 2, 2026"
     * rather than "2 September". Asked for.
     *
     * It is deliberately not what the team app does, and the difference is the
     * reader. Everything the team sees is en-GB — `13 Aug 2026` on a response,
     * `Sent 13 Aug` in the list, `dd/mm/yyyy` in the date field — and mixing
     * orders *there* is how a date gets typed wrong once a year with nobody
     * able to say when. A client reads this one date, on one screen, with the
     * month spelled out in full, so there is nothing to confuse it with and no
     * field to mistype: `September 2` cannot be read as the 9th.
     *
     * The year comes with the format and is worth having. A questionnaire sent
     * in December for a January deadline says so, instead of leaving somebody
     * to guess which side of the new year "2 January" falls on.
     */
    dueOn: row.survey.dueAt
      ? {
          en: new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Asia/Bangkok',
          }).format(row.survey.dueAt),
          th: new Intl.DateTimeFormat('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Bangkok',
          }).format(row.survey.dueAt),
        }
      : null,
    archived: row.project.archived,
    /* End of the chosen day in Bangkok — `endOfDay` anchors it at +07:00 — so a
       client answering at 11pm on the date still gets in. */
    overdue: !!row.survey.dueAt && row.survey.dueAt.getTime() < Date.now(),
    steps,
    /* Numbered questions only, so the welcome screen's promise and the last
       number the respondent reaches are the same figure. Name and email are
       not numbered and are not counted. */
    questionCount: steps.reduce(
      (n, s) => n + s.questions.filter((q) => q.number !== null).length,
      0,
    ),
  };
}
