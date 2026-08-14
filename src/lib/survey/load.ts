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
  eyebrowEn: string;
  headingEn: string;
  descEn?: string;
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
    archived: row.project.archived,
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
