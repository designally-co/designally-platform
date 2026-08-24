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
 *
 * **7, from 21 August 2026, and this one does change the content.** Question 14
 * of the Brand package — the last of the strategy block — is the celebrity
 * question now: *"If your brand were a celebrity or well-known person, who
 * would it be?"* It replaces the brand-voice question that stood there through
 * version 6, which asked what voice to use with customers and inside the team.
 *
 * Same block, same order, same `paragraph` type, still required, so the count
 * is untouched: twenty-one questions, and every other number the client sees —
 * the disc, the send screen's grid, the analysis — is unchanged.
 *
 * **Answers to the two are not comparable, and that is the difference from
 * version 6.** A version-6 respondent described a tone of voice; a version-7
 * one names a person. Anything reading across versions has to treat question 14
 * as two different questions that share a number.
 */
/**
 * **Bumping this is two changes, and the second one is not in git.**
 *
 * Raising the number here and editing `seed/question-blocks.json` is the code
 * half. The other half is importing that version into every database the app
 * runs against — `npm run db:seed` locally, and again with `DATABASE_URL` set
 * to Neon for production. Until that is done the deployed app reads zero
 * questions at this version, and the New project sheet offers "Brand · 0
 * questions" for a package that has twenty-one.
 *
 * This happened on 21 August 2026: version 7 shipped to Vercel while Neon still
 * held only version 6, and creating a survey stopped working until the seed was
 * run. Nothing reached a client — `createSurvey` counts the questions before it
 * writes anything and refuses rather than minting a link to an empty
 * questionnaire — but the team could not send anything for as long as it took
 * to notice.
 *
 * The seed is safe to run against production: it imports one version, leaves
 * earlier ones alone so sent surveys still resolve, refuses to replace a
 * question anybody has answered, and skips the example project on any database
 * that is not the local one.
 */
export const CURRENT_QUESTION_VERSION = 7;

export function blocksFor(_kind: SurveyKind, pkg: Package): BlockKey[] {
  return [...PACKAGE_BLOCKS[pkg]];
}
