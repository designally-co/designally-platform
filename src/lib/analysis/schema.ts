import { z } from 'zod';

/**
 * The shape of insights — docs/insight-engine-spec.md, "Suggested insights
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
 * **It is deliberately flat.** The first version nested sections inside wrapper
 * objects; the API rejected it with "the compiled grammar is too large".
 * Structured outputs compile the schema into a grammar and nested
 * arrays-of-objects multiply its size, so flattening the wrappers is what makes
 * it compile. Keep it flat — a tidy-looking re-nesting fails at runtime, not at
 * build.
 *
 * It also used to be split across two passes, because the deck outline and the
 * room notes pushed even the flattened set past the limit. Both went with the
 * kick-off on 17 August 2026, and what is left compiles as one.
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
      'The single most consequential finding, in one sentence a person could read aloud to the client. Usually the highest-severity conflict or a red flag. Insights that opens with this is read; one that opens with a project summary is skimmed.',
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

  /* 3 · unsettled — ranked; the decisions somebody has to make */
  unsettled: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            'The disagreement as a question somebody can answer — "Who is the customer?", not "Audience misalignment".',
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
          'What this means for the work — usually that the client needs a workshop rather than a moodboard, and that the quotation is exposed to revisions.',
        ),
    }),
  ),

  /* 6 · signals */
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

/**
 * There was a second pass. It is gone, and so is the split.
 *
 * It carried a deck outline and a set of notes on running the kick-off room —
 * the two survivors of the 13 August narrowing, which had also cut the client's
 * repeated vocabulary, the decoded references, a reading of every scale pair,
 * and creative notes on adjective clusters, all of them the engine reading the
 * answers *for* the team.
 *
 * Both went on 17 August 2026 with the kick-off itself: the platform's job ends
 * at the summary. What is left is what the spec's own filter keeps — if we
 * removed this, would the team make a worse decision? — and it compiles as one
 * schema, which is why `analyse` is a single call again.
 *
 * Insights rows written before that date still hold the two fields. Nothing
 * reads them and nothing strips them: they are what the analysis said on the
 * day it ran, and rewriting history to match a later decision would make every
 * stored insight a guess about when it was written.
 */
export const InsightsSchema = FindingsSchema;

export type Insights = z.infer<typeof FindingsSchema>;
export type Findings = Insights;
