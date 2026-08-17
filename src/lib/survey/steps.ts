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
  /**
   * The section a question belongs to, shown to the client.
   *
   * The questionnaire has two, and both packages have both: everything before
   * the visual block is Project Information, the visual block is Visual
   * Direction. The branding team asked for this because a respondent twelve
   * questions in had no idea the survey had a shape.
   *
   * Presentation, not content — so it lives here rather than in the seed, and
   * adding it does not bump the question version or invalidate a sent survey.
   *
   * The name field has none. It is one field before the questions start, and
   * calling it a section would promise a third one.
   */
  sectionEn?: string;
  sectionTh?: string;
  /** the small line above the heading — "Step 2 of 4 — Your brand" */
  eyebrowEn: string;
  headingEn: string;
  descEn?: string;
  descTh?: string;
  /** "blockKey.order" */
  questions: string[];
};

/** the two sections the questionnaire has, in both packages */
const INFO = { sectionEn: 'Project Information', sectionTh: 'ข้อมูลโปรเจกต์' };
const DIRECTION = { sectionEn: 'Visual Direction', sectionTh: 'ทิศทางงานออกแบบ' };

const IDENTITY: StepDef = {
  eyebrowEn: 'About you',
  headingEn: 'First, tell us who you are',
  descEn: 'Anyone on your team can answer this — please pass the link to whoever should have a say.',
  descTh: 'ส่งลิงก์นี้ต่อให้ผู้ที่ควรมีส่วนร่วมได้เลย',
  questions: ['identity.1', 'identity.2', 'identity.3'],
};

/**
 * Part 2, word for word the same in both packages, in three screens.
 *
 * The seven visual questions are three different acts: the feeling you want,
 * the feeling you do not, and the practical constraints. Keeping them apart is
 * what stops "choose 3 words" and "final file formats" sharing a heading.
 */
const VISUAL_STEPS: StepDef[] = [
  {
    ...DIRECTION,
    eyebrowEn: 'The feeling',
    headingEn: 'How it should feel',
    descEn: 'The mood you want people to get from it.',
    descTh: 'ความรู้สึกที่อยากให้คนได้รับ',
    questions: ['visual.1', 'visual.2'],
  },
  {
    ...DIRECTION,
    eyebrowEn: 'What to avoid',
    headingEn: 'What you do not want',
    descEn: 'Just as useful as what you do — it saves a round of revisions.',
    descTh: 'สำคัญไม่แพ้สิ่งที่อยากได้ ช่วยลดการแก้งาน',
    questions: ['visual.4', 'visual.5'],
  },
  {
    ...DIRECTION,
    eyebrowEn: 'References and limits',
    headingEn: 'What you like, and what the work must fit',
    descEn: 'Anything the design has to live inside — sizes, platforms, existing assets.',
    descTh: 'สิ่งที่งานออกแบบต้องอยู่ในกรอบ เช่น ขนาด แพลตฟอร์ม หรือสิ่งที่มีอยู่เดิม',
    questions: ['visual.3', 'visual.6', 'visual.7'],
  },
];

/**
 * The steps below are the screens. Two to four questions each.
 *
 * This was one question per screen, which the prototype and the CI's own survey
 * kit both recommend and which is genuinely good for a conversational intake.
 * The branding team asked for grouping on 17 August 2026: twenty-one screens is
 * twenty-one taps and twenty-one identical layouts, and questions that belong to
 * one thought were arriving one at a time with no way to see them together.
 *
 * Grouped by subject, never by count. A screen holds questions somebody would
 * answer in one breath — where you came from; what you promise; what to avoid —
 * so the heading above them is true rather than a label over an arbitrary
 * bundle. That is why the personality scales sit alone: ten rows is already a
 * screenful, and nothing else belongs in the same breath as them.
 */

/** Brand Strategy + Brand Identity — identity, six strategy screens, three visual. */
const BRAND_STEPS: StepDef[] = [
  IDENTITY,
  {
    ...INFO,
    eyebrowEn: 'Where you came from',
    headingEn: 'Your story, and what only you offer',
    descEn: 'Short, honest answers are perfect.',
    descTh: 'ตอบสั้น ๆ ตามจริงได้เลย',
    questions: ['strategy.7', 'strategy.1'],
  },
  {
    ...INFO,
    eyebrowEn: 'What you promise',
    headingEn: 'What customers can always count on',
    descEn: 'The things you would protect even when it costs you.',
    descTh: 'สิ่งที่คุณจะรักษาไว้ แม้ต้องแลกมาด้วยต้นทุน',
    questions: ['strategy.6', 'strategy.8', 'strategy.2'],
  },
  {
    ...INFO,
    eyebrowEn: 'Who it is for',
    headingEn: 'Your customers, and what they worry about',
    descEn: 'Who buys from you, and what makes them hesitate.',
    descTh: 'ลูกค้าของคุณเป็นใคร และอะไรทำให้เขาลังเล',
    questions: ['strategy.10', 'strategy.3'],
  },
  {
    ...INFO,
    eyebrowEn: 'What they remember',
    headingEn: 'What should stay with them',
    descEn: 'What sets you apart, and the one thing you want left behind.',
    descTh: 'สิ่งที่ทำให้คุณต่าง และสิ่งเดียวที่อยากให้เขาจดจำ',
    questions: ['strategy.4', 'strategy.9', 'strategy.12'],
  },
  {
    ...INFO,
    eyebrowEn: 'Brand personality',
    headingEn: 'Where does your brand sit?',
    descEn: 'For each pair, tap the point that feels right. The middle means balanced.',
    descTh: 'แตะจุดที่ตรงกับความรู้สึกของคุณ จุดกลางหมายถึงอยู่ตรงกลางระหว่างสองด้าน',
    /* alone: ten pairs is a screenful, and nothing shares that breath */
    questions: ['strategy.5'],
  },
  {
    ...INFO,
    eyebrowEn: 'How it speaks',
    headingEn: 'The voice, inside and out',
    descEn: 'How the brand sounds to customers, and how your team talks about it.',
    descTh: 'แบรนด์พูดกับลูกค้าอย่างไร และทีมพูดถึงแบรนด์อย่างไร',
    questions: ['strategy.14', 'strategy.11', 'strategy.13'],
  },
  ...VISUAL_STEPS,
];

/** Design — identity, two project screens, the same three visual screens. */
const DESIGN_STEPS: StepDef[] = [
  IDENTITY,
  {
    ...INFO,
    eyebrowEn: 'The brand today',
    headingEn: 'Where the brand stands, and who it speaks to',
    descEn: 'Where it came from, and who buys from you.',
    descTh: 'แบรนด์มีที่มาอย่างไร และใครคือลูกค้าของคุณ',
    questions: ['project.1', 'project.2'],
  },
  {
    ...INFO,
    eyebrowEn: 'This project',
    headingEn: 'What this work has to do',
    descEn: 'The job it must do, and where it will be used.',
    descTh: 'งานชิ้นนี้ต้องทำหน้าที่อะไร และจะถูกใช้ที่ไหน',
    questions: ['project.3', 'project.4'],
  },
  ...VISUAL_STEPS,
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
