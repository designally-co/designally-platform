import { z } from 'zod';

/**
 * The shape of a brief — docs/insight-engine-spec.md, "Suggested brief
 * structure", ordered by what a person needs first.
 *
 * The most important property of this schema is what it *cannot* express.
 * Rule 7 forbids percentages and sentiment scores, and the spec is blunt about
 * why: three to twenty respondents cannot support them. So there is no numeric
 * field anywhere in this schema. Agreement and disagreement are carried as
 * **arrays of respondent names**, and every count the interface shows is
 * derived by counting that array. A model that wanted to emit "67% positive"
 * has nowhere to put it, and a future contributor who wants to add a score has
 * to change the schema first — which is the point at which someone should stop
 * and re-read rule 7.
 *
 * The same reasoning applies to rule 4: there is no field for an estimated
 * content volume, client-facing or internal.
 */

const RespondentNames = z
  .array(z.string())
  .describe(
    'The names of the respondents who said this, exactly as they gave them. Never a count, never a percentage — the interface counts this array itself.',
  );

const Quote = z.object({
  text: z
    .string()
    .describe(
      "The respondent's own words, verbatim, in the language they wrote them. Never translated, never tidied — a client's own phrasing gets approved faster than the agency's.",
    ),
  respondent: z.string().describe('Who said it.'),
});

/* ── 1 · read this first ──────────────────────────────────────────── */

const ReadThisFirst = z.object({
  headline: z
    .string()
    .describe(
      'The single most consequential finding, said in one sentence a person could read aloud to the client. Usually the highest-severity conflict or a red flag. A brief that opens with this is read; one that opens with a project summary is skimmed.',
    ),
  body: z
    .string()
    .describe(
      'Two to four sentences expanding the headline and saying what it means for the work. Plain, unhedged.',
    ),
});

/* ── 2 · settled ──────────────────────────────────────────────────── */

const Agreement = z.object({
  statement: z
    .string()
    .describe('What the respondents independently agree on. The team can design on this without asking.'),
  respondents: RespondentNames,
  evidence: z
    .array(Quote)
    .describe('Optional supporting quotes, verbatim. Omit rather than invent.'),
});

/* ── 3 · unsettled ────────────────────────────────────────────────── */

const SEVERITY = ['high', 'medium', 'low'] as const;

const ConflictSide = z.object({
  position: z.string().describe('One side of the disagreement, stated plainly.'),
  respondents: RespondentNames,
  evidence: z.array(Quote).describe('Verbatim quotes for this side. Omit rather than invent.'),
});

const Conflict = z.object({
  question: z
    .string()
    .describe(
      'The disagreement as a question the kick-off can answer — "Who is the customer?", not "Audience misalignment".',
    ),
  severity: z
    .enum(SEVERITY)
    .describe(
      'Judged by how much work a late reversal destroys, never by how strongly people disagree. high — audience and positioning, which invalidate everything downstream. medium — tone, which costs a rewrite. low — preferences that cost an afternoon.',
    ),
  severityReason: z
    .string()
    .describe('One sentence on what a late reversal would cost. This is what justifies the ranking.'),
  sides: z.array(ConflictSide).describe('Two or more positions. Each carries its own respondents.'),
  decisionMakerPosition: z
    .string()
    .nullable()
    .describe(
      'Which side the person who claimed final decision authority is on, or null if no decision maker answered or they did not address it. Never guess.',
    ),
});

/* ── 4 · not decided by the client yet ────────────────────────────── */

const ClarityGap = z.object({
  topic: z.string().describe('What nobody could answer.'),
  whatWasSeen: z
    .string()
    .describe(
      'How it showed up — blank answers, one-word answers, explicit uncertainty ("ยังไม่มี"). Read individually these look lazy; read together they say the organisation has not decided.',
    ),
  respondents: RespondentNames.describe(
    'Who left it blank or uncertain. An empty array is valid if it applies across the board.',
  ),
  consequence: z
    .string()
    .describe(
      'What this means for the work — usually that the kick-off needs a workshop rather than a moodboard, and that the quotation is exposed to revisions.',
    ),
});

/* ── 5 · for the creative team ────────────────────────────────────── */

const VocabularyItem = z.object({
  phrase: z.string().describe("The client's own word or phrase, verbatim, in their language."),
  respondents: RespondentNames,
  note: z.string().describe('Why it matters — usually that the client already believes it, so nobody has to be persuaded.'),
});

const Reference = z.object({
  brand: z.string().describe('The brand named.'),
  admiredOrDisliked: z.enum(['admired', 'disliked']),
  reasonsGiven: z
    .array(z.string())
    .describe(
      'The reasons respondents actually gave. This is the data; the name is only the label. "Speed of communication" means behave boldly, not look like them.',
    ),
  respondents: RespondentNames,
  whatItMeans: z
    .string()
    .describe('The decoded direction — what the team should take from it, as distinct from the brand itself.'),
});

const ScaleReading = z.object({
  pair: z.string().describe('The pair, e.g. "Traditional – Modern".'),
  reading: z
    .string()
    .describe(
      'Where the respondents sit and, more importantly, whether they agree. The disagreement width is the finding, not the average.',
    ),
  split: z
    .boolean()
    .describe('True when the respondents genuinely disagree and the kick-off must resolve it.'),
});

const CreativeNote = z.object({
  heading: z.string(),
  body: z.string().describe('Plain prose. Report what the client said and what it implies — never choose the design direction, that is the designer\'s work.'),
});

const ForCreativeTeam = z.object({
  vocabulary: z.array(VocabularyItem).describe('Words and phrases the stakeholders repeat, extracted verbatim.'),
  references: z.array(Reference).describe('Brands named, decoded by the reason given rather than the name.'),
  scales: z
    .array(ScaleReading)
    .describe('Only where a linear scale was answered. Lead with the splits; say plainly how many were near-unanimous.'),
  notes: z
    .array(CreativeNote)
    .describe('Package-specific findings — adjective clusters, archetype signal, the avoid list and its contradictions.'),
});

/* ── 6 · signals ──────────────────────────────────────────────────── */

const ALIGNMENT = ['high consensus', 'some divergence', 'fragmented'] as const;

const Signal = z.object({
  label: z
    .string()
    .describe('Short label — "Internal alignment", "Decision maker", "Outlier".'),
  finding: z.string().describe('What is true, stated plainly.'),
  severity: z.enum(SEVERITY),
});

const Signals = z.object({
  alignment: z
    .enum(ALIGNMENT)
    .describe(
      'One honest read on how unified the client organisation is. Sets expectations for revision rounds and justifies a bigger discovery phase when one is genuinely needed.',
    ),
  alignmentReason: z.string().describe('One or two sentences on why.'),
  flags: z
    .array(Signal)
    .describe(
      'Only what the data triggered — a missing decision maker, an outlier disagreeing with everyone, low-effort answers, a stated–revealed contradiction, single-respondent risk. Their rarity is what makes them read. An empty array is a good outcome.',
    ),
});

/* ── 7 · deck outline ─────────────────────────────────────────────── */

const DeckSlide = z.object({
  title: z.string(),
  purpose: z.string().describe('What this slide is for, in one line.'),
  needsDecision: z
    .boolean()
    .describe('True when this slide asks the room to decide something. Conflicts become DECIDE slides and belong early.'),
});

/* ── 8 · how to run the room — internal only ──────────────────────── */

const FacilitationNote = z.object({
  heading: z.string(),
  body: z.string(),
});

/* ── the brief ────────────────────────────────────────────────────── */

export const BriefSchema = z.object({
  readThisFirst: ReadThisFirst,
  settled: z.array(Agreement),
  unsettled: z.array(Conflict).describe('Ranked most severe first. These become the DECIDE slides.'),
  notDecidedYet: z.array(ClarityGap),
  forCreativeTeam: ForCreativeTeam,
  signals: Signals,
  deckOutline: z.array(DeckSlide),
  /**
   * Rule 8 — internal facilitation notes are never rendered on a client-facing
   * surface. Kept as its own field rather than a flag on shared content, so a
   * client-facing renderer cannot leak it by forgetting to check a boolean.
   */
  howToRunTheRoom: z
    .array(FacilitationNote)
    .describe(
      'Internal only. How to handle the room — what to open with, what to press on, what to handle gently. This is never shown to a client.',
    ),
});

export type Brief = z.infer<typeof BriefSchema>;
export type BriefConflict = z.infer<typeof Conflict>;
export const SEVERITY_ORDER: Record<(typeof SEVERITY)[number], number> = {
  high: 0,
  medium: 1,
  low: 2,
};
