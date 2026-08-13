import type { BlockKey, QuestionType } from '@/lib/db/schema';

/**
 * The shapes and labels the question library is rendered from. Kept apart from
 * library.ts, which opens a database connection — a client component importing
 * one symbol from that module would drag the Postgres driver into the browser
 * bundle.
 */

export type LibraryQuestion = {
  order: number;
  textEn: string;
  textTh: string;
  type: QuestionType;
  /** the per-type settings, said in words — "24 choices · pick 6–10" */
  settings: string | null;
  version: number;
};

export type LibraryBlock = {
  key: BlockKey;
  nameEn: string;
  nameTh: string;
  usedBy: string;
  questions: LibraryQuestion[];
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  paragraph: 'Paragraph',
  short_text: 'Short text',
  multiple_choice: 'Multiple choice',
  checkboxes: 'Checkboxes',
  linear_scale: 'Linear scale',
};

/**
 * How many questions a package's blocks add up to — what the client will see
 * numbered, which is what the team means by "how long is this".
 *
 * The identity block is a name, and the survey prints no number beside it
 * (`load.ts`), so counting it here would promise 22 where the last question on
 * screen reads 21. It held an email too until question version 4.
 */
export function countQuestions(library: LibraryBlock[], keys: readonly BlockKey[]) {
  return library
    .filter((b) => keys.includes(b.key) && b.key !== 'identity')
    .reduce((n, b) => n + b.questions.length, 0);
}
