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
  /**
   * The screen's subject, in the masthead beside the count.
   *
   * There was an English second line under it too, and on nine screens out of
   * eleven it restated the heading in plainer words — "Your customers, and what
   * they worry about" over "Who buys from you, and what makes them hesitate."
   * Two English sentences saying one thing, before the questions that say it
   * again. Deleted 17 August 2026. `descTh` stays: it is the Thai of the
   * heading, and it is the only Thai on the screen until a question is opened.
   */
  /**
   * The screen's subject, and **one line, always**.
   *
   * These were sentences — "Your customers, and what they worry about",
   * "Where the brand stands, and who it speaks to" — which wrapped to two and
   * three lines beside the count disc on a phone. Each step already carried a
   * short phrase for the same job in an `eyebrowEn` that was written when the
   * masthead had an eyebrow and was never once rendered. The phrases are the
   * headings now and the sentences are gone; the questions underneath say what
   * the sentences were saying, at more length and in two languages.
   *
   * **Three words at most.** Two of the phrases came over at four — "Where you
   * came from" and "Who it is for" — and they were the two that would not fit
   * a 320px screen. Three is the cap the set is written to now; the guard that
   * enforces it is `white-space: nowrap` on `.qtopic`, which ellipses a long
   * one rather than wrapping it into the question.
   */
  headingEn: string;
  descTh?: string;
  /** "blockKey.order" */
  questions: string[];
};

/** the two sections the questionnaire has, in both packages */
const INFO = { sectionEn: 'Project Information', sectionTh: 'ข้อมูลโปรเจกต์' };
const DIRECTION = { sectionEn: 'Visual Direction', sectionTh: 'ทิศทางงานออกแบบ' };

/**
 * The identity screen carries a section of its own — 19 August 2026.
 *
 * It ran without one, then took `INFO` on the reasoning that a masthead
 * showing a section on every screen but the first makes the first look
 * unfinished. The heading was right and the label was not: **Project
 * Information is about the client's brand, and this screen is about the person
 * answering.** Name, position and email are not information about a project,
 * and a respondent reading "Project Information" over three fields asking who
 * they are is being told the wrong thing about the screen they are on.
 *
 * "Before we start" is true of it and is a section rather than a second
 * heading — the questionnaire proper begins on the next screen. The masthead
 * keeps its two lines, which is what it is sized for, and the count still
 * starts at the first real question.
 */
const IDENTITY: StepDef = {
  sectionEn: 'Before we start',
  sectionTh: 'ก่อนเริ่ม',
  headingEn: 'About you',
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
    headingEn: 'Mood and impression',
    descTh: 'ความรู้สึกที่อยากให้คนได้รับ',
    questions: ['visual.1', 'visual.2'],
  },
  {
    ...DIRECTION,
    headingEn: 'What to avoid',
    descTh: 'สำคัญไม่แพ้สิ่งที่อยากได้ ช่วยลดการแก้งาน',
    questions: ['visual.4', 'visual.5'],
  },
  {
    ...DIRECTION,
    headingEn: 'References and limits',
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
    headingEn: 'Where you began',
    descTh: 'ตอบสั้น ๆ ตามจริงได้เลย',
    questions: ['strategy.7', 'strategy.1'],
  },
  {
    ...INFO,
    headingEn: 'What you promise',
    descTh: 'สิ่งที่คุณจะรักษาไว้ แม้ต้องแลกมาด้วยต้นทุน',
    questions: ['strategy.6', 'strategy.8', 'strategy.2'],
  },
  {
    ...INFO,
    headingEn: 'Your customers',
    descTh: 'ลูกค้าของคุณเป็นใคร และอะไรทำให้เขาลังเล',
    questions: ['strategy.10', 'strategy.3'],
  },
  {
    ...INFO,
    headingEn: 'What they remember',
    descTh: 'สิ่งที่ทำให้คุณต่าง และสิ่งเดียวที่อยากให้เขาจดจำ',
    questions: ['strategy.4', 'strategy.9', 'strategy.12'],
  },
  {
    ...INFO,
    headingEn: 'Brand personality',
    descTh: 'ถ้าแบรนด์เป็นคน จะเป็นคนแบบไหน และเป็นใคร',
    /**
     * The scales, and the celebrity question after them — 21 August 2026.
     *
     * It sat alone, on the note that ten pairs is a screenful and nothing
     * shares that breath. `strategy.14` does: *"If your brand were a person,
     * what would they be like?"* and *"If your brand were a celebrity, who
     * would it be?"* are one question asked twice, once as a set of dials and
     * once in a name, and somebody who has just placed ten dots has the answer
     * already in mind.
     *
     * It is here because it had to leave *How it speaks*, whose heading — and
     * whose Thai, "how the brand talks to customers and how the team talks
     * about it" — described the brand-voice question that stood at
     * `strategy.14` until this morning. Swapping the question and leaving it
     * under that heading broke the rule the file is built on: the heading over
     * a screen has to be true of everything under it.
     */
    questions: ['strategy.5', 'strategy.14'],
  },
  {
    ...INFO,
    headingEn: 'How it speaks',
    /* Both of these are about the team — what they can say with confidence and
       the one thing they should carry. The customer half of this heading went
       with the voice question. */
    descTh: 'ทีมพูดถึงแบรนด์อย่างไร และอยากให้เขาจดจำอะไร',
    questions: ['strategy.11', 'strategy.13'],
  },
  ...VISUAL_STEPS,
];

/** Design — identity, three project screens, the same three visual screens. */
const DESIGN_STEPS: StepDef[] = [
  IDENTITY,
  {
    ...INFO,
    headingEn: 'The brand today',
    descTh: 'แบรนด์มีที่มาอย่างไร และใครคือลูกค้าของคุณ',
    questions: ['project.1', 'project.2'],
  },
  {
    ...INFO,
    headingEn: 'Brand persona',
    /**
     * Its own screen, and the count is not the reason — 21 August 2026, asked
     * for as question 3 of the Design package.
     *
     * One question on a screen looks thin beside the three- and four-question
     * screens either side, and this file's rule is that a screen holds what
     * somebody answers in one breath. Naming a person the brand resembles is
     * that breath: it is neither *the brand today* — where it came from and who
     * buys it — nor *the job ahead*, which is what this piece of work has to do.
     * Filed under either, the heading above it stops being true.
     *
     * Brand asks the same question at `strategy.14`, where it follows the
     * personality scales. Design has no scales, so here it stands on its own.
     * **The two are separate rows and both have to be edited** — only the
     * `visual` block is shared between the packages.
     */
    questions: ['project.3'],
  },
  {
    ...INFO,
    headingEn: 'The job ahead',
    descTh: 'งานชิ้นนี้ต้องทำหน้าที่อะไร และจะถูกใช้ที่ไหน',
    /* 4 and 5 since the persona question took 3 — the refs are `block.order`,
       and `stepsFor` only checks that the *block* exists, so an order left out
       of this list disappears from the survey without an error anywhere. */
    questions: ['project.4', 'project.5'],
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
      headingEn: blockNames[key]?.nameEn ?? key,
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
