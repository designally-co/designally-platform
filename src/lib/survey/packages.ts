import type { BlockKey, Package, SurveyKind } from '@/lib/db/schema';

/**
 * Which blocks each package attaches. Mirrors `packages` in
 * seed/question-blocks.json — `npm run db:seed` asserts the two agree and fails
 * loudly if they drift.
 *
 * `visual` is word-for-word identical across both packages, so it is one block
 * rather than two copies: editing a visual question updates both questionnaires
 * (docs/questionnaire-architecture.md). A client buys one package or the other,
 * never both, so nobody is ever asked it twice.
 */
export const PACKAGE_BLOCKS: Record<Package, readonly BlockKey[]> = {
  brand: ['identity', 'strategy', 'visual'],
  design: ['identity', 'project', 'visual'],
};

/**
 * The question version a new survey is sent with. Rule 5: this is frozen onto
 * the survey row at creation, so editing the template later cannot change what
 * a respondent was asked. `npm run db:seed` fails if this and the seed file's
 * `version` disagree — the two must move together or new surveys go out asking
 * questions that were never imported.
 */
export const CURRENT_QUESTION_VERSION = 2;

export function blocksFor(_kind: SurveyKind, pkg: Package): BlockKey[] {
  return [...PACKAGE_BLOCKS[pkg]];
}
