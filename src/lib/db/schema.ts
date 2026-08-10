/**
 * Data model — CLAUDE.md "Data model".
 *
 * Two rules shape this file and are easy to break later:
 *
 *   Rule 2 — four human gates, each recording who acted. Every gate stores a
 *   `*_by` and an `*_at`. There is no default, no trigger, no timer that can
 *   fill them in.
 *
 *   Rule 5 — questions are versioned. A survey stores the question version and
 *   the block keys it was sent with, so editing a template later cannot change
 *   what a respondent was asked.
 */
import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/* ── team ─────────────────────────────────────────────────────────── */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ── clients and projects ─────────────────────────────────────────── */

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  projectCode: text('project_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** branding runs 5 stages; website and both run 7. Never hard-code five. */
export const PACKAGES = ['branding', 'website', 'both'] as const;
export type Package = (typeof PACKAGES)[number];

export const STAGE_FLOW: Record<Package, readonly string[]> = {
  branding: ['Lead', 'Proposal', 'Survey', 'Analysis', 'Kick-off'],
  website: ['Lead', 'Proposal', 'Survey', 'Analysis', 'Kick-off', 'Content', 'Build'],
  both: ['Lead', 'Proposal', 'Survey', 'Analysis', 'Kick-off', 'Content', 'Build'],
};

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  package: text('package').$type<Package>().notNull(),
  /** index into STAGE_FLOW[package] */
  stage: integer('stage').notNull().default(2),

  kickoffAt: timestamp('kickoff_at', { withTimezone: true }),
  /** populated from the website block's maps_to answers, once a human confirms them */
  pages: text('pages'),
  languages: text('languages').array(),

  /* gate 4 — archive. Manual, always. Nothing archives itself. */
  archived: boolean('archived').notNull().default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => users.id),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ── the question library ─────────────────────────────────────────── */

export const BLOCK_KEYS = [
  'identity',
  'core',
  'branding',
  'website',
  'content',
  'ecommerce',
] as const;
export type BlockKey = (typeof BLOCK_KEYS)[number];

export const questionBlocks = pgTable('question_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').$type<BlockKey>().notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameTh: text('name_th').notNull(),
  introEn: text('intro_en'),
  introTh: text('intro_th'),
  /** the seed's `shown_when` — ecommerce is conditional on the website block */
  shownWhen: text('shown_when'),
});

export const QUESTION_TYPES = [
  'paragraph',
  'short_text',
  'multiple_choice',
  'checkboxes',
  'linear_scale',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Per-type settings. Exactly the five types the Google Forms used. */
export type QuestionConfig = {
  /** multiple_choice, checkboxes */
  choices?: { en: string; th: string; label?: string }[];
  /** multiple_choice, checkboxes — allow a free-text "Other" */
  other?: boolean;
  /** checkboxes */
  min?: number;
  max?: number;
  /** linear_scale */
  points?: number;
  pairs?: { left_en: string; left_th: string; right_en: string; right_th: string }[];
  /** populates a project field — decision_maker | pages | languages | skus */
  maps_to?: string;
  /** choice label → block key that the choice reveals */
  triggers?: Record<string, BlockKey>;
};

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockId: uuid('block_id')
      .notNull()
      .references(() => questionBlocks.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    textEn: text('text_en').notNull(),
    textTh: text('text_th').notNull(),
    helpEn: text('help_en'),
    helpTh: text('help_th'),
    type: text('type').$type<QuestionType>().notNull(),
    config: jsonb('config').$type<QuestionConfig>().notNull().default({}),
    required: boolean('required').notNull().default(true),
    /** Rule 5. Editing a question writes a new row at version + 1. */
    version: integer('version').notNull().default(1),
  },
  (t) => [unique('questions_block_order_version').on(t.blockId, t.order, t.version)],
);

/* ── surveys ──────────────────────────────────────────────────────── */

export const SURVEY_KINDS = ['discovery', 'content'] as const;
export type SurveyKind = (typeof SURVEY_KINDS)[number];

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<SurveyKind>().notNull(),
  token: text('token').notNull().unique(),

  /* Rule 5 — frozen at send. Editing a template cannot reach back into this. */
  questionVersion: integer('question_version').notNull().default(1),
  blockKeys: text('block_keys').array().$type<BlockKey[]>().notNull(),

  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),

  /* gate 1 — close collection */
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: uuid('closed_by').references(() => users.id),
});

export const responses = pgTable('responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  respondentName: text('respondent_name').notNull(),
  role: text('role'),
  /** the identity block's third question, verbatim — never a boolean */
  decisionMaker: text('decision_maker'),
  email: text('email'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per question answered. `value` is tagged by kind so the analysis can
 * read it without re-deriving the question type:
 *   { kind: 'text',   text: string }
 *   { kind: 'choice', choice: string, other?: string }
 *   { kind: 'multi',  choices: string[], other?: string }
 *   { kind: 'scale',  points: number, values: Record<string, number> }  // key = pair index
 */
export type AnswerValue =
  | { kind: 'text'; text: string }
  | { kind: 'choice'; choice: string; other?: string }
  | { kind: 'multi'; choices: string[]; other?: string }
  | { kind: 'scale'; points: number; values: Record<string, number> };

export const answers = pgTable('answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id')
    .notNull()
    .references(() => responses.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id),
  value: jsonb('value').$type<AnswerValue>().notNull(),
});

/**
 * A part-finished survey. One link is shared between several stakeholders, so a
 * draft belongs to a device, not to a survey — `draft_key` lives in that
 * browser's localStorage. Drafts are never promoted to responses automatically;
 * only a submit writes a response.
 */
export const surveyDrafts = pgTable(
  'survey_drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    draftKey: text('draft_key').notNull(),
    step: integer('step').notNull().default(0),
    values: jsonb('values').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('survey_drafts_survey_key').on(t.surveyId, t.draftKey)],
);

/* ── what comes out of the survey ─────────────────────────────────── */

export const briefs = pgTable('briefs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  /** structured, not a blob of markdown */
  content: jsonb('content').notNull(),

  /* gate 2 — confirm the brief. Rule 6: nothing reaches a client before this. */
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
});

export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  /** "still open" is a valid outcome */
  outcome: text('outcome').notNull(),
  note: text('note'),

  /* gate 3 — record the kick-off decisions */
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  recordedBy: uuid('recorded_by').references(() => users.id),
});

/* ── relations ────────────────────────────────────────────────────── */

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  surveys: many(surveys),
  briefs: many(briefs),
  decisions: many(decisions),
}));

export const questionBlocksRelations = relations(questionBlocks, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  block: one(questionBlocks, {
    fields: [questions.blockId],
    references: [questionBlocks.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  project: one(projects, { fields: [surveys.projectId], references: [projects.id] }),
  responses: many(responses),
  drafts: many(surveyDrafts),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  survey: one(surveys, { fields: [responses.surveyId], references: [surveys.id] }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  response: one(responses, { fields: [answers.responseId], references: [responses.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));
