import type { BlockKey, Package, SurveyKind } from '@/lib/db/schema';

/**
 * How questions group into the steps a respondent walks through.
 *
 * Version 1 hand-interleaved the `core` and `branding` blocks because the
 * prototype did. The version-2 questionnaire has no reason to: it arrives from
 * the branding team already in two parts, and `visual` is word-for-word
 * identical across both packages. So the steps follow the blocks, and a new
 * package gets a sensible flow without anyone writing one.
 *
 * The long strategy block is the exception — fourteen questions is too many for
 * one screenful, and PRODUCT.md asks for one question group per screen. It is
 * split where the subject changes: what the brand is, then who it is for.
 */
export type StepDef = {
  /** the small line above the heading — "Step 2 of 4 — Your brand" */
  eyebrowEn: string;
  headingEn: string;
  descEn?: string;
  descTh?: string;
  /** "blockKey.order" */
  questions: string[];
};

const IDENTITY: StepDef = {
  eyebrowEn: 'About you',
  headingEn: 'First, tell us who you are',
  descEn: 'Anyone on your team can answer this — please pass the link to whoever should have a say.',
  descTh: 'ส่งลิงก์นี้ต่อให้ผู้ที่ควรมีส่วนร่วมได้เลย',
  questions: ['identity.1', 'identity.2', 'identity.3'],
};

const VISUAL: StepDef = {
  eyebrowEn: 'Visual direction',
  headingEn: 'How it should look and feel',
  descEn: 'The mood you want, and just as usefully, what you want to avoid.',
  descTh: 'ทิศทางงานออกแบบที่ต้องการ และสิ่งที่ไม่อยากให้เป็น',
  questions: ['visual.1', 'visual.2', 'visual.3', 'visual.4', 'visual.5', 'visual.6', 'visual.7'],
};

/** Brand Strategy + Brand Identity — identity, strategy in three parts, visual. */
const BRAND_STEPS: StepDef[] = [
  IDENTITY,
  {
    eyebrowEn: 'What the brand is',
    headingEn: 'What makes your brand hard to replace',
    descEn: 'Where you come from, and what only you offer. Short, honest answers are perfect.',
    descTh: 'เล่าให้เราฟังว่าแบรนด์ของคุณมีที่มาอย่างไร และมีอะไรที่แบรนด์อื่นทดแทนได้ยาก',
    questions: ['strategy.1', 'strategy.7', 'strategy.2', 'strategy.6', 'strategy.8'],
  },
  {
    eyebrowEn: 'Who it is for',
    headingEn: 'Your customers, and what they worry about',
    descEn: 'Who buys from you, what makes them hesitate, and what you want them to remember.',
    descTh: 'ลูกค้าของคุณเป็นใคร กังวลเรื่องอะไร และอยากให้เขาจดจำอะไร',
    questions: ['strategy.10', 'strategy.3', 'strategy.4', 'strategy.9', 'strategy.12'],
  },
  {
    eyebrowEn: 'Brand personality',
    headingEn: 'Where does your brand sit?',
    descEn: 'For each pair, tap the point that feels right. The middle means balanced.',
    descTh: 'แตะจุดที่ตรงกับความรู้สึกของคุณ จุดกลางหมายถึงอยู่ตรงกลางระหว่างสองด้าน',
    questions: ['strategy.5', 'strategy.14', 'strategy.11', 'strategy.13'],
  },
  VISUAL,
];

/** Design — identity, the four project questions, visual. */
const DESIGN_STEPS: StepDef[] = [
  IDENTITY,
  {
    eyebrowEn: 'About this project',
    headingEn: 'The brand, and what this work is for',
    descEn: 'Where the brand stands today, who it speaks to, and what this piece of work has to do.',
    descTh: 'แบรนด์อยู่ตรงไหน พูดกับใคร และงานชิ้นนี้ต้องทำหน้าที่อะไร',
    questions: ['project.1', 'project.2', 'project.3', 'project.4'],
  },
  VISUAL,
];

const BY_PACKAGE: Record<Package, StepDef[]> = {
  brand: BRAND_STEPS,
  design: DESIGN_STEPS,
};

/**
 * A survey sent before the version-2 questionnaire carries blocks that no
 * package attaches any more. Those keep working by falling back to a step per
 * block, using the block's own name and intro from the seed — insights written
 * from them is still readable, which is what rule 5 promises.
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
  _kind: SurveyKind,
  pkg: Package,
  blockKeys: BlockKey[],
  blockOrders: Record<string, number[]>,
  blockNames: Record<string, { nameEn: string; introEn?: string | null; introTh?: string | null }>,
): StepDef[] {
  const defined = BY_PACKAGE[pkg];
  /* Only use the written flow when the survey actually carries those blocks —
     an older survey on the same package must not be re-grouped under headings
     for questions it was never sent. */
  const known = new Set(blockKeys);
  const fits = defined?.every((s) => s.questions.every((ref) => known.has(ref.split('.')[0] as BlockKey)));
  if (defined && fits) return defined;
  return stepsFromBlocks(blockKeys, blockOrders, blockNames);
}
