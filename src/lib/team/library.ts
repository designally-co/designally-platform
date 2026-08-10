import { asc } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { questionBlocks, questions, type BlockKey, type QuestionType } from '@/lib/db/schema';
import { PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { QUESTION_TYPE_LABEL, type LibraryBlock } from './library-types';

/** Reads back to the team what a client is actually asked. */
export async function loadQuestionLibrary(): Promise<LibraryBlock[]> {
  const db = await getDb();

  const blocks = await db.select().from(questionBlocks);
  const all = await db.select().from(questions).orderBy(asc(questions.order));

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
    .sort((a, b) => order(a.key) - order(b.key));
}

function usedBy(key: BlockKey) {
  const packages = Object.entries(PACKAGE_BLOCKS)
    .filter(([, keys]) => keys.includes(key))
    .map(([name]) =>
      name === 'both' ? 'Branding + Website' : name[0].toUpperCase() + name.slice(1),
    );
  return packages.length ? packages.join(' · ') : 'Content survey';
}

function order(key: BlockKey) {
  return ['identity', 'core', 'branding', 'website', 'ecommerce', 'content'].indexOf(key);
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
