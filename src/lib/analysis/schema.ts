import { z } from 'zod';

/**
 * The shape of a brief — docs/insight-engine-spec.md, "Suggested brief
 * structure", ordered by what a person needs first.
 *
 * The most important property of this schema is what it *cannot* express.
 * Rule 7 forbids percentages and sentiment scores, and the spec is blunt about
 * why: three to twenty respondents cannot support them. So there is no numeric
 * field anywhere. Agreement and disagreement are carried as **arrays of
 * respondent names**, and every count the interface shows is derived by
 * counting that array. A model that wanted to emit "67% positive" has nowhere
 * to put it, and a contributor who wants to add a score has to change the
 * schema first — which is where someone should stop and re-read rule 7.
 *
 * The same reasoning applies to rule 4: there is no field for an estimated
 * content volume, client-facing or internal.
 *
 * **It is deliberately flat, and deliberately split in two.** The first
 * version nested sections inside wrapper objects; the API rejected it with
 * "the compiled grammar is too large". Structured outputs compile the schema
 * into a grammar and nested arrays-of-objects multiply its size. Flattening
 * the wrappers was not enough on its own — the whole brief is past the limit
 * however it is arranged — so the analysis runs as two passes, each with a
 * schema that compiles.
 *
 * The split is not only a workaround. docs/insight-engine-spec.md says the
 * deck outline is "generated from 2, 3 and 5", so the second pass reading the
 * first pass's findings is the order the spec already describes.
 *
 * Keep both halves flat, and keep them halves. A tidy-looking re-nesting or a
 * merge back into one schema fails at runtime, not at build.
 */

const RespondentNames = z
  .array(z.string())
  .describe(
    'The names of the respondents who said this, exactly as they gave them. Never a count, never a percentage — the interface counts this array itself.',
  );

const Quotes = z
  .array(z.string())
  .describe(
    'Supporting quotes in the respondent\'s own words, verbatim and in the language they wrote them — Thai stays Thai. Format each as: the quote, then an em dash, then who said it. Omit rather than invent: if you have no quote, return an empty array.',
  );

const SEVERITY = ['high', 'medium', 'low'] as const;
const ALIGNMENT = ['high consensus', 'some divergence', 'fragmented'] as const;

export const FindingsSchema = z.object({
  /* 1 · read this first — the most consequential finding, first */
  headline: z
    .string()
    .describe(
      'The single most consequential finding, in one sentence a person could read aloud to the client. Usually the highest-severity conflict or a red flag. A brief that opens with this is read; one that opens with a project summary is skimmed.',
    ),
  headlineBody: z
    .string()
    .describe('Two to four sentences expanding the headline and saying what it means for the work. Plain, unhedged.'),

  /* 2 · settled — what the team can design on without asking */
  settled: z
    .array(
      z.object({
        statement: z.string().describe('What the respondents independently agree on.'),
        respondents: RespondentNames,
        quotes: Quotes,
      }),
    )
    .describe('Only genuine independent agreement. Two people answering a question at all is not agreement.'),

  /* 3 · unsettled — ranked; these become the DECIDE slides */
  unsettled: z
    .array(
      z.object({
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
        severityReason: z.string().describe('One sentence on what a late reversal would cost.'),
        sides: z
          .array(
            z.object({
              position: z.string().describe('One side of the disagreement, stated plainly.'),
              respondents: RespondentNames,
              quotes: Quotes,
            }),
          )
          .describe('Two or more positions, each with its own respondents.'),
      }),
    )
    .describe('Ranked most severe first.'),

  /* 4 · not decided by the client yet — the clarity gaps */
  notDecidedYet: z.array(
    z.object({
      topic: z.string().describe('What nobody could answer.'),
      whatWasSeen: z
        .string()
        .describe(
          'How it showed up — blank answers, one-word answers, explicit uncertainty ("ยังไม่มี"). Read individually these look lazy; read together they say the organisation has not decided.',
        ),
      respondents: RespondentNames,
      consequence: z
        .string()
        .describe(
          'What this means for the work — usually that the kick-off needs a workshop rather than a moodboard, and that the quotation is exposed to revisions.',
        ),
    }),
  ),

  /* 6 · signals — a finding, so it belongs in pass one */
  alignment: z
    .enum(ALIGNMENT)
    .describe(
      'One honest read on how unified the client organisation is. Sets expectations for revision rounds and justifies a bigger discovery phase when one is genuinely needed.',
    ),
  alignmentReason: z.string().describe('One or two sentences on why.'),
  flags: z
    .array(
      z.object({
        label: z.string().describe('Short label — "Outlier", "Low effort", "Single respondent".'),
        finding: z.string().describe('What is true, stated plainly.'),
        severity: z.enum(SEVERITY),
      }),
    )
    .describe(
      'Only what the data triggered — one person disagreeing with everyone, low-effort answers, a stated–revealed contradiction, single-respondent risk. Their rarity is what makes them read, so do not pad this.',
    ),
});

/** Pass two — written with the findings above already in hand. */
export const CreativeSchema = z.object({
  /* 5 · for the creative team */
  vocabulary: z
    .array(
      z.object({
        phrase: z.string().describe("The client's own word or phrase, verbatim, in their language."),
        respondents: RespondentNames,
        note: z.string().describe('Why it matters — usually that the client already believes it, so nobody has to be persuaded.'),
      }),
    )
    .describe('Words and phrases the stakeholders repeat. Copy written in the client\'s own language gets approved faster.'),

  references: z
    .array(
      z.object({
        brand: z.string(),
        admiredOrDisliked: z.enum(['admired', 'disliked']),
        reasonsGiven: z
          .array(z.string())
          .describe('The reasons respondents actually gave. This is the data; the name is only the label.'),
        respondents: RespondentNames,
        whatItMeans: z
          .string()
          .describe(
            'The decoded direction. If people named a brand for its speed and boldness and nobody mentioned how it looks, it means behave boldly — not look like them.',
          ),
      }),
    )
    .describe('Brands named, decoded by the reason rather than the name.'),

  scales: z
    .array(
      z.object({
        pair: z.string().describe('The pair, e.g. "Traditional – Modern".'),
        reading: z
          .string()
          .describe('Where respondents sit and, more importantly, whether they agree. The disagreement width is the finding, not the average.'),
        split: z.boolean().describe('True when respondents genuinely disagree and the kick-off must resolve it.'),
      }),
    )
    .describe('Only where a linear scale was answered. Lead with the splits and say plainly how many were near-unanimous.'),

  creativeNotes: z
    .array(
      z.object({
        heading: z.string(),
        body: z
          .string()
          .describe(
            "Report what the client said and what it implies — never choose the design direction, that is the designer's work.",
          ),
      }),
    )
    .describe('Adjective clusters, archetype signal, the avoid list and any contradiction between what they want and what they say to avoid.'),

  /* 7 · deck outline — built from settled, unsettled and the creative notes */
  deckOutline: z.array(
    z.object({
      title: z.string(),
      purpose: z.string().describe('What this slide is for, in one line.'),
      needsDecision: z
        .boolean()
        .describe('True when this slide asks the room to decide something. Conflicts become DECIDE slides and belong early.'),
    }),
  ),

  /**
   * Rule 8 — internal facilitation notes never render on a client-facing
   * surface. Its own field rather than a flag on shared content, so a
   * client-facing renderer cannot leak it by forgetting to check a boolean.
   */
  howToRunTheRoom: z
    .array(z.object({ heading: z.string(), body: z.string() }))
    .describe(
      'Internal only, never shown to a client. How to handle the room — what to open with, what not to move past, what to handle gently and why. It can be blunt about people in a way the rest cannot.',
    ),
});

/** The stored brief is both passes merged. */
export const BriefSchema = FindingsSchema.and(CreativeSchema);

export type Findings = z.infer<typeof FindingsSchema>;
export type Creative = z.infer<typeof CreativeSchema>;
export type Brief = Findings & Creative;
