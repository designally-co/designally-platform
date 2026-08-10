import type { BlockKey, Package, SurveyKind } from '@/lib/db/schema';

/**
 * How questions group into the steps a respondent walks through.
 *
 * The branding sequence is ported from reference/designally-app.html — same
 * five steps, same headings, same copy. It deliberately interleaves the `core`
 * and `branding` blocks: a client tells the story of their business and their
 * brand as one story, not as two sections.
 *
 * Questions are referenced as "blockKey.order", never by database id, so a
 * survey sent at question version 1 and one sent at version 3 use the same
 * step definition.
 */
export type StepDef = {
  /** the small line above the heading — "Step 2 of 5 — Brand discovery" */
  eyebrowEn: string;
  headingEn: string;
  descEn?: string;
  descTh?: string;
  /** "blockKey.order" */
  questions: string[];
};

const BRANDING_STEPS: StepDef[] = [
  {
    eyebrowEn: 'About you',
    headingEn: 'First, tell us who you are',
    descEn: 'Anyone on your team can answer this — please pass the link to whoever should have a say.',
    descTh: 'ส่งลิงก์นี้ต่อให้ผู้ที่ควรมีส่วนร่วมได้เลย',
    questions: ['identity.1', 'identity.2', 'identity.3'],
  },
  {
    eyebrowEn: 'Brand discovery',
    headingEn: 'The story of your brand',
    descEn: 'Where you come from, and what you offer. Short, honest answers are perfect.',
    descTh: 'เล่าให้เราฟังว่าแบรนด์ของคุณมีที่มาอย่างไร',
    questions: [
      'branding.1', // How did your brand start?
      'core.1', // main product or service
      'core.2', // one short sentence
      'core.3', // competitors
      'branding.2', // what you believe in
      'core.4', // most proud of
      'core.5', // target audience
      'core.6', // unique selling point
      'branding.3', // problems you solve
      'core.7', // existing guidelines
    ],
  },
  {
    eyebrowEn: 'How it should feel',
    headingEn: 'Feelings and inspiration',
    descEn: 'How your brand should feel, and the brands you admire.',
    descTh: 'ความรู้สึกที่แบรนด์ควรมอบให้ และแบรนด์ที่คุณชื่นชม',
    questions: [
      'core.8', // how should they feel
      'branding.4', // brands that inspire
      'branding.5', // competitor you like
      'branding.6', // brand you don't like
      'branding.7', // favourite design work
      'branding.8', // anything you don't want to see
    ],
  },
  {
    eyebrowEn: 'Brand personality',
    headingEn: 'Where does your brand sit?',
    descEn: 'For each pair, tap the point that feels right. The middle means balanced.',
    descTh: 'แตะจุดที่ตรงกับความรู้สึกของคุณ',
    questions: ['core.9'], // the ten personality scales
  },
  {
    eyebrowEn: 'Identity',
    headingEn: 'The character of your brand',
    questions: [
      'branding.9', // if your brand were a famous person
      'branding.10', // select 6–10 words
      'core.10', // qualities to avoid
      'branding.11', // any detailed design brief (optional)
    ],
  },
];

/**
 * Website, both, and the content survey have no step sequence written down yet.
 * Until milestone 5 settles one, fall back to a step per block, using the
 * block's own name and intro from the seed. `blockOrders` supplies the question
 * orders present for each block.
 */
function stepsFromBlocks(
  blockKeys: BlockKey[],
  blockOrders: Record<string, number[]>,
  blockNames: Record<string, { nameEn: string; introEn?: string | null; introTh?: string | null }>,
): StepDef[] {
  return blockKeys
    .filter((key) => (blockOrders[key] ?? []).length > 0)
    .map((key) => ({
      eyebrowEn: blockNames[key]?.nameEn ?? key,
      headingEn: blockNames[key]?.nameEn ?? key,
      descEn: blockNames[key]?.introEn ?? undefined,
      descTh: blockNames[key]?.introTh ?? undefined,
      questions: (blockOrders[key] ?? []).map((order) => `${key}.${order}`),
    }));
}

export function stepsFor(
  kind: SurveyKind,
  pkg: Package,
  blockKeys: BlockKey[],
  blockOrders: Record<string, number[]>,
  blockNames: Record<string, { nameEn: string; introEn?: string | null; introTh?: string | null }>,
): StepDef[] {
  if (kind === 'discovery' && pkg === 'branding') return BRANDING_STEPS;
  return stepsFromBlocks(blockKeys, blockOrders, blockNames);
}
