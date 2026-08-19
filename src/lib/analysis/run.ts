import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { FindingsSchema, type Insights } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';

/**
 * The analysis. Server-side only — the key never reaches a client bundle,
 * which `server-only` enforces at build time rather than by convention.
 */

const MODEL = 'claude-opus-5';

/**
 * Effort is the latency and cost lever, and it matters here more than usual:
 * the analysis runs inside a request, and a serverless function has a ceiling.
 * At the default `high` this took over five minutes, which exceeds
 * what a Vercel function will allow. `medium` is the setting to beat — raise
 * it if the insights stop finding conflicts, and re-measure the wall clock when
 * you do.
 */
const EFFORT = 'medium';

export type AnalysisResult =
  | { ok: true; insights: Insights; usage: { input: number; output: number } }
  | { ok: false; error: string };

export async function analyse(input: {
  clientName: string;
  packageLabel: string;
  respondentCount: number;
  transcript: string;
}): Promise<AnalysisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        'ANTHROPIC_API_KEY is not set, so the insights cannot be written. Nothing else changed — run the analysis again once the key is configured.',
    };
  }

  const client = new Anthropic();

  /**
   * One pass.
   *
   * There were two, because the deck outline and the room notes pushed the
   * combined schema past the structured-output grammar limit and had to be
   * asked for separately, given the first pass's findings. Both were dropped on
   * 17 August 2026 — the platform's job ends at the summary — and the split
   * went with them: what is left compiles on its own.
   *
   * That halves the API calls, and it takes the second call's latency out of a
   * request that already runs close to a serverless function's ceiling.
   */
  const first = await callPass(client, FindingsSchema, buildUserPrompt(input));
  if (!first.ok) return first;

  const insights = first.value as Insights;

  const missing = findMissingSections(insights);
  if (missing) return { ok: false, error: missing };

  const violation = findForbiddenNumbers(insights);
  if (violation) return { ok: false, error: violation };

  return { ok: true, insights, usage: first.usage };
}

type PassResult =
  | { ok: true; value: unknown; usage: { input: number; output: number } }
  | { ok: false; error: string };

async function callPass(
  client: Anthropic,
  schema: typeof FindingsSchema,
  prompt: string,
): Promise<PassResult> {
  try {
    /* Streaming because the insights run long and a non-streaming request at this
       max_tokens risks an HTTP timeout. */
    const stream = client.messages.stream({
      model: MODEL,
      /**
       * Kept at 32000 even though the output is smaller now. A 26-person
       * survey is long, and the failure this guards against is not a clean
       * refusal: at 16000 the response was truncated mid-string, and because
       * the SDK parses inside finalMessage() that arrived as an opaque JSON
       * error rather than the max_tokens branch below, so the check never ran.
       */
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      /* Structured outputs, so the insights arrives as data rather than as
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
          'The insights ran past the output limit and would have been cut off mid-sentence, so nothing was saved. This usually means an unusually large number of responses.',
      };
    }

    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'The model returned no insights.' };

    const parsed = schema.safeParse(JSON.parse(text.text));
    if (!parsed.success) {
      return {
        ok: false,
        error: `The insights did not match the expected shape: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
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
          'The insights were cut off before they finished and could not be read, so nothing was saved. This usually means an unusually long survey. Run the analysis again.',
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'The analysis failed.' };
  }
}

/**
 * Insights are allowed to find nothing — an empty conflict list on a genuinely
 * aligned client is a real result, and empty flags is a good outcome. The
 * headline is not a finding, it is always written, so an empty one means the
 * run failed quietly rather than that there was nothing to say.
 *
 * This used to guard the deck outline and the room notes too, after both came
 * back empty on the real ARUN+ survey and nothing complained. Those are gone;
 * the reasoning is not. Silence is the worst outcome; refuse.
 */
function findMissingSections(insights: Insights): string | null {
  const empty: string[] = [];
  if (!insights.headline.trim()) empty.push('an opening finding');

  if (!empty.length) return null;
  return `The insights came back without ${empty.join(' and ')}, which every analysis has. It was not saved. Run the analysis again.`;
}

/**
 * Rule 7 belt-and-braces. The schema has no numeric field, so an invented
 * statistic can only arrive inside prose.
 *
 * **What rule 7 forbids is the analysis inventing a statistic about the
 * respondents**, not any percentage anywhere. The first version matched every
 * `%` and threw away a whole insights for faithfully repeating a client's own
 * claim — "เราส่งมอบตรงเวลา 100%" — which principle 7 says must survive
 * verbatim. The second still fired, on "one respondent claims 100% on-time
 * delivery": proximity to the word *respondent* is not the signal.
 *
 * The test is what FOLLOWS the number. "80% of respondents" is derived and is
 * refused; an attributed claim passes.
 */
function findForbiddenNumbers(insights: Insights): string | null {
  const FORBIDDEN = [
    /\b\d+(\.\d+)?\s*(%|percent|per cent)\s+(of\s+)?(the\s+)?(respondents?|people|stakeholders?|them|answers?|participants?)/i,
    /\b\d+(\.\d+)?\s*(%|percent|per cent)\s+(agree|disagree|said|positive|negative|favou?r)/i,
    /\b(sentiment|confidence|positivity|alignment)\s+(score|rating|index)\b/i,
    /\bscore(d|s)?\s+\d+(\.\d+)?\s*(\/|out of)\s*\d+/i,
  ];

  /* Quotes are the client's own words and are reproduced verbatim by design —
     a client who says "40% of our revenue" keeps their sentence. */
  const prose: string[] = [
    insights.headline,
    insights.headlineBody,
    ...insights.settled.map((s) => s.statement),
    ...insights.unsettled.flatMap((c) => [
      c.question,
      c.severityReason,
      ...c.sides.map((s) => s.position),
    ]),
    ...insights.notDecidedYet.flatMap((g) => [g.topic, g.whatWasSeen, g.consequence]),
    insights.alignmentReason,
    ...insights.flags.map((f) => f.finding),
  ];

  for (const line of prose) {
    for (const pattern of FORBIDDEN) {
      const hit = line.match(pattern);
      if (hit) {
        /* Quote the sentence, not just the match — a bare "100%" tells whoever
           reads this nothing about which line to look at. */
        const at = hit.index ?? 0;
        const sentence = line.slice(Math.max(0, at - 90), at + 90).trim();
        return `The insights described the respondents as a proportion: "…${sentence}…". That is not honest with this few people (rule 7), so it was not saved. Run the analysis again.`;
      }
    }
  }
  return null;
}
