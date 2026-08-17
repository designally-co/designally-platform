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
 *
 * **6, from 17 August 2026.** Version 5's wording went out with the label its
 * own screen heading already said — "Mood and Personality — choose 3 words…"
 * under a heading reading "Mood and impression" — and two questions with no
 * full stop. The fix could not reach version 5: `scripts/seed.ts` refuses to
 * replace a question anybody has answered, which is rule 5 working. A new
 * version is how a correction reaches a client without rewriting what an
 * earlier client was asked.
 *
 * Nothing about the questionnaire's *content* changed — same twenty-one
 * questions, same order, same types, same answers comparable across both
 * versions. Only the words in front of them.
 */
export const CURRENT_QUESTION_VERSION = 6;

export function blocksFor(_kind: SurveyKind, pkg: Package): BlockKey[] {
  return [...PACKAGE_BLOCKS[pkg]];
}
