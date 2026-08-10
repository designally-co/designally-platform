import type { BlockKey, Package, SurveyKind } from '@/lib/db/schema';

/**
 * Which blocks each package attaches. Mirrors `packages` in
 * seed/question-blocks.json — `npm run db:seed` asserts the two agree and fails
 * loudly if they drift.
 *
 * A "both" client answers `core` ONCE. That is the whole point of the block
 * architecture (docs/questionnaire-architecture.md).
 */
export const PACKAGE_BLOCKS: Record<Package, readonly BlockKey[]> = {
  branding: ['identity', 'core', 'branding'],
  website: ['identity', 'core', 'website', 'ecommerce'],
  both: ['identity', 'core', 'branding', 'website', 'ecommerce'],
};

export const CONTENT_SURVEY_BLOCKS: readonly BlockKey[] = ['content'];

export function blocksFor(kind: SurveyKind, pkg: Package): BlockKey[] {
  return [...(kind === 'content' ? CONTENT_SURVEY_BLOCKS : PACKAGE_BLOCKS[pkg])];
}
