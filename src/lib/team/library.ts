import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { questionBlocks, questions, type BlockKey, type QuestionType } from '@/lib/db/schema';
import { CURRENT_QUESTION_VERSION, PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { PACKAGE_LABEL } from '@/lib/team/labels';
import { QUESTION_TYPE_LABEL, type LibraryBlock } from './library-types';

/**
 * Reads back to the team what a client is actually asked.
 *
 * Only the current version. Every earlier version's rows are still in the table
 * — rule 5 keeps them so an already-sent survey still resolves — and reading
 * them all made the new-survey sheet offer "Brand · 50 questions", the sum of
 * versions 1, 2 and 3 stacked on top of each other. What a *new* survey asks is
 * one version, and that is the only number this screen may show.
 *
 * Reading an already-sent survey is `loadSurvey`'s job, and it filters by the
 * version frozen onto the survey row.
 */
export async function loadQuestionLibrary(): Promise<LibraryBlock[]> {
  const db = await getDb();

  const blocks = await db.select().from(questionBlocks);
  const all = await db
    .select()
    .from(questions)
    .where(eq(questions.version, CURRENT_QUESTION_VERSION))
    .orderBy(asc(questions.order));

  return blocks
    .map((b) => ({
      key: b.key,
      nameEn: b.nameEn,
      nameTh: b.nameTh,
      usedBy: usedBy(b.key),
      questions: all
        .filter((q) => q.blockId === b.id)
        .map((q) => ({
          order: q.order,
          textEn: q.textEn,
          textTh: q.textTh,
          type: q.type,
          settings: describeConfig(q.type, q.config),
          version: q.version,
        })),
    }))
    /**
     * A block with no questions at this version is not part of the
     * questionnaire — it is a row left in the table by an older one.
     *
     * The retired keys stay in `question_blocks` and in `BLOCK_KEYS` because a
     * survey sent against them must still resolve (rule 5). But listing them
     * here put five headings in front of the team reading "0 questions ·
     * Retired — kept for surveys already sent", which stopped being true the
     * moment the last of those surveys was cleared. An empty heading is not a
     * record of anything; it is five lines of noise above the four that matter.
     */
    .filter((b) => b.questions.length > 0)
    .sort((a, b) => order(a.key) - order(b.key));
}

function usedBy(key: BlockKey) {
  const packages = Object.entries(PACKAGE_BLOCKS)
    .filter(([, keys]) => keys.includes(key))
    .map(([name]) => PACKAGE_LABEL[name as keyof typeof PACKAGE_LABEL] ?? name);
  return packages.length ? packages.join(' · ') : 'Retired — kept for surveys already sent';
}

function order(key: BlockKey) {
  return ['identity', 'strategy', 'project', 'visual', 'core', 'branding', 'website', 'ecommerce', 'content'].indexOf(key);
}

function describeConfig(
  type: QuestionType,
  config: {
    choices?: unknown[];
    min?: number;
    max?: number;
    points?: number;
    pairs?: unknown[];
    other?: boolean;
  },
): string | null {
  const parts: string[] = [];

  if (type === 'multiple_choice' || type === 'checkboxes') {
    if (config.choices?.length) parts.push(`${config.choices.length} choices`);
    if (config.other) parts.push('plus Other');
    if (typeof config.min === 'number' && typeof config.max === 'number') {
      parts.push(`pick ${config.min}–${config.max}`);
    } else if (typeof config.max === 'number') {
      parts.push(`at most ${config.max}`);
    }
  }

  if (type === 'linear_scale') {
    if (config.pairs?.length) parts.push(`${config.pairs.length} pairs`);
    if (config.points) parts.push(`${config.points} points`);
  }

  return parts.length ? parts.join(' · ') : null;
}

export { QUESTION_TYPE_LABEL };
export type { LibraryBlock, LibraryQuestion } from './library-types';
