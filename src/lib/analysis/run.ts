import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { CreativeSchema, FindingsSchema, type Brief, type Creative, type Findings } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt, buildCreativePrompt } from './prompt';

/**
 * The analysis. Server-side only — the key never reaches a client bundle,
 * which `server-only` enforces at build time rather than by convention.
 */

const MODEL = 'claude-opus-5';

/**
 * Effort is the latency and cost lever, and it matters here more than usual:
 * the analysis runs inside a request, and a serverless function has a ceiling.
 * At the default `high` the two passes took over five minutes, which exceeds
 * what a Vercel function will allow. `medium` is the setting to beat — raise
 * it if the briefs stop finding conflicts, and re-measure the wall clock when
 * you do.
 */
const EFFORT = 'medium';

export type AnalysisResult =
  | { ok: true; brief: Brief; usage: { input: number; output: number } }
  | { ok: false; error: string };

export async function analyse(input: {
  clientName: string;
  packageLabel: string;
  respondentCount: number;
  transcript: string;
  /** Respondents who claimed final decision authority. An empty list is a flag. */
  decisionMakers: string[];
}): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        'ANTHROPIC_API_KEY is not set, so the brief cannot be written. Collection is still closed — run the analysis again once the key is configured.',
    };
  }

  const client = new Anthropic();

  /**
   * Two passes, because the whole brief is past the structured-output grammar
   * limit however it is arranged (see schema.ts). Pass two is given pass one's
   * findings, which is also the order docs/insight-engine-spec.md describes —
   * the deck outline is generated from the settled and unsettled sections.
   */
  const first = await callPass(client, FindingsSchema, buildUserPrompt(input));
  if (!first.ok) return first;

  const second = await callPass(
    client,
    CreativeSchema,
    buildCreativePrompt(input, first.value as Findings),
  );
  if (!second.ok) return second;

  const brief = withDecisionMakerFlag(
    { ...(first.value as Findings), ...(second.value as Creative) } as Brief,
    input,
  );

  const missing = findMissingSections(brief);
  if (missing) return { ok: false, error: missing };

  const violation = findForbiddenNumbers(brief);
  if (violation) return { ok: false, error: violation };

  return {
    ok: true,
    brief,
    usage: {
      input: first.usage.input + second.usage.input,
      output: first.usage.output + second.usage.output,
    },
  };
}

type PassResult =
  | { ok: true; value: unknown; usage: { input: number; output: number } }
  | { ok: false; error: string };

async function callPass(
  client: Anthropic,
  schema: typeof FindingsSchema | typeof CreativeSchema,
  prompt: string,
): Promise<PassResult> {
  try {
    /* Streaming because a brief is long and a non-streaming request at this
       max_tokens risks an HTTP timeout. */
    const stream = client.messages.stream({
      model: MODEL,
      /**
       * A complete brief for a 26-person survey runs to a dozen deck slides,
       * ten scale readings and ten facilitation notes. At 16000 the second
       * pass was truncated mid-string, and because the SDK parses inside
       * finalMessage() that surfaced as an opaque JSON error rather than the
       * max_tokens branch below — the check never got to run.
       */
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      /* Structured outputs, so the brief arrives as data rather than as
         markdown to be parsed later. */
      output_config: { format: zodOutputFormat(schema), effort: EFFORT },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();

    /* A safety classifier can decline; that is an HTTP 200, not an error. */
    if (message.stop_reason === 'refusal') {
      return {
        ok: false,
        error:
          'The model declined to analyse these answers. Nothing has been written. This is worth reading yourself before trying again.',
      };
    }

    if (message.stop_reason === 'max_tokens') {
      return {
        ok: false,
        error:
          'The brief ran past the output limit and would have been cut off mid-sentence, so nothing was saved. This usually means an unusually large number of responses.',
      };
    }

    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'The model returned no brief.' };

    const parsed = schema.safeParse(JSON.parse(text.text));
    if (!parsed.success) {
      return {
        ok: false,
        error: `The brief did not match the expected shape: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
      };
    }

    return {
      ok: true,
      value: parsed.data,
      usage: { input: message.usage.input_tokens, output: message.usage.output_tokens },
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'The Anthropic API is rate limited right now. Try again in a minute.' };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'ANTHROPIC_API_KEY was rejected. Check the key.' };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `The Anthropic API returned ${err.status}: ${err.message}` };
    }
    /* The SDK parses structured output inside finalMessage(), so a response cut
       off at the token limit arrives here as a JSON error rather than reaching
       the max_tokens branch above. Say what actually happened. */
    if (err instanceof Error && /parse structured output/i.test(err.message)) {
      return {
        ok: false,
        error:
          'The brief was cut off before it finished and could not be read, so nothing was saved. This usually means an unusually long survey. Run the analysis again.',
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'The analysis failed.' };
  }
}

/**
 * Guarantees the decision-maker flag rather than hoping for it.
 *
 * docs/insight-engine-spec.md: "If nobody marked themselves as final decision
 * maker, everything in the conflict section is unresolvable and the kick-off
 * needs the right person in the room. This is a red flag worth stating first."
 *
 * That makes it mandatory, not something the model decides is interesting. On
 * the real ARUN+ survey — where not one of 26 people claimed authority — the
 * flags array came back empty twice running. The condition is deterministic and
 * already known here, so it is asserted rather than requested: a finding the
 * database can prove should never depend on the model's attention.
 *
 * If the model did raise it, its wording is kept and only moved to the front.
 */
function withDecisionMakerFlag(
  brief: Brief,
  input: { decisionMakers: string[]; respondentCount: number },
): Brief {
  const existing = brief.flags.findIndex((f) => /decision[- ]?maker/i.test(f.label));

  if (input.decisionMakers.length > 0) {
    /* Somebody owns the decision. Nothing to add. */
    return brief;
  }
  if (input.respondentCount === 0) return brief;

  const flag =
    existing >= 0
      ? brief.flags[existing]
      : {
          label: 'Decision maker',
          finding:
            input.respondentCount === 1
              ? 'The one person who answered did not claim final decision authority, so nothing here can be treated as settled. The kick-off needs whoever does decide, in the room.'
              : `Not one of the ${input.respondentCount} people who answered claimed final decision authority. Every conflict below is therefore unresolvable from the survey alone — the kick-off needs the person who decides, in the room, or it will produce agreement that does not hold.`,
          severity: 'high' as const,
        };

  const rest = brief.flags.filter((_, i) => i !== existing);
  return { ...brief, flags: [flag, ...rest] };
}

/**
 * A brief is allowed to find nothing — an empty conflict list on a genuinely
 * aligned client is a real result, and empty flags is a good outcome. But some
 * sections are not findings, they are always written: every project gets a deck
 * outline and notes on running the room.
 *
 * On the real ARUN+ survey those came back empty and nothing complained. The
 * schema was satisfied, because an empty array is a valid array, and the team
 * would have opened a brief with no deck and no facilitation notes with no way
 * to know anything had gone wrong. Silence is the worst outcome; refuse.
 */
function findMissingSections(brief: Brief): string | null {
  const empty: string[] = [];
  if (!brief.headline.trim()) empty.push('an opening finding');
  if (!brief.deckOutline.length) empty.push('a kick-off deck outline');
  if (!brief.howToRunTheRoom.length) empty.push('notes on running the room');

  if (!empty.length) return null;
  return `The brief came back without ${empty.join(' and ')}, which every brief has. It was not saved. Run the analysis again.`;
}

/**
 * Rule 7 belt-and-braces. The schema has no numeric field, so an invented
 * statistic can only arrive inside prose.
 *
 * **What rule 7 forbids is the analysis inventing a statistic about the
 * respondents**, not any percentage anywhere. The first version matched every
 * `%` and threw away a whole brief for faithfully repeating a client's own
 * claim — "เราส่งมอบตรงเวลา 100%" — which principle 7 says must survive
 * verbatim. The second still fired, on "one respondent claims 100% on-time
 * delivery": proximity to the word *respondent* is not the signal.
 *
 * The test is what FOLLOWS the number. "80% of respondents" is derived and is
 * refused; an attributed claim passes.
 */
function findForbiddenNumbers(brief: Brief): string | null {
  const FORBIDDEN = [
    /\b\d+(\.\d+)?\s*(%|percent|per cent)\s+(of\s+)?(the\s+)?(respondents?|people|stakeholders?|them|answers?|participants?)/i,
    /\b\d+(\.\d+)?\s*(%|percent|per cent)\s+(agree|disagree|said|positive|negative|favou?r)/i,
    /\b(sentiment|confidence|positivity|alignment)\s+(score|rating|index)\b/i,
    /\bscore(d|s)?\s+\d+(\.\d+)?\s*(\/|out of)\s*\d+/i,
  ];

  /* Quotes are the client's own words and are reproduced verbatim by design —
     a client who says "40% of our revenue" keeps their sentence. */
  const prose: string[] = [
    brief.headline,
    brief.headlineBody,
    ...brief.settled.map((s) => s.statement),
    ...brief.unsettled.flatMap((c) => [
      c.question,
      c.severityReason,
      c.decisionMakerPosition,
      ...c.sides.map((s) => s.position),
    ]),
    ...brief.notDecidedYet.flatMap((g) => [g.topic, g.whatWasSeen, g.consequence]),
    ...brief.vocabulary.map((v) => v.note),
    ...brief.references.flatMap((r) => [...r.reasonsGiven, r.whatItMeans]),
    ...brief.scales.map((s) => s.reading),
    ...brief.creativeNotes.flatMap((n) => [n.heading, n.body]),
    brief.alignmentReason,
    ...brief.flags.map((f) => f.finding),
    ...brief.deckOutline.flatMap((d) => [d.title, d.purpose]),
    ...brief.howToRunTheRoom.flatMap((n) => [n.heading, n.body]),
  ];

  for (const line of prose) {
    for (const pattern of FORBIDDEN) {
      const hit = line.match(pattern);
      if (hit) {
        /* Quote the sentence, not just the match — a bare "100%" tells whoever
           reads this nothing about which line to look at. */
        const at = hit.index ?? 0;
        const sentence = line.slice(Math.max(0, at - 90), at + 90).trim();
        return `The brief described the respondents as a proportion: "…${sentence}…". That is not honest with this few people (rule 7), so it was not saved. Run the analysis again.`;
      }
    }
  }
  return null;
}
