import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { BriefSchema, type Brief } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';

/**
 * The analysis. Server-side only — the key never reaches a client bundle,
 * which `server-only` enforces at build time rather than by convention.
 */

const MODEL = 'claude-opus-5';

export type AnalysisResult =
  | { ok: true; brief: Brief; usage: { input: number; output: number } }
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
        'ANTHROPIC_API_KEY is not set, so the brief cannot be written. Collection is still closed — run the analysis again once the key is configured.',
    };
  }

  const client = new Anthropic();

  try {
    /* Streaming because a full brief is long and a non-streaming request at
       this max_tokens risks an HTTP timeout. */
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      /* Structured outputs, so the brief arrives as data. Rule: stored as
         structured data, never as a blob of markdown. */
      output_config: { format: zodOutputFormat(BriefSchema) },
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
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
    if (!text || text.type !== 'text') {
      return { ok: false, error: 'The model returned no brief.' };
    }

    const parsed = BriefSchema.safeParse(JSON.parse(text.text));
    if (!parsed.success) {
      return {
        ok: false,
        error: `The brief did not match the expected shape: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
      };
    }

    const violation = findForbiddenNumbers(parsed.data);
    if (violation) return { ok: false, error: violation };

    return {
      ok: true,
      brief: parsed.data,
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
    return { ok: false, error: err instanceof Error ? err.message : 'The analysis failed.' };
  }
}

/**
 * Rule 7 belt-and-braces. The schema has no numeric field, so a percentage can
 * only arrive inside prose — and prose is exactly where "roughly 67% of
 * respondents" would slip through. Refuse the brief rather than store one.
 *
 * Deliberately narrow: it matches a number bound to a proportion word, not any
 * number. "5 of 28 people" and "2 of 3" are honest and must pass; a client
 * quoting "we grew 40%" verbatim must also pass, which is why quotes are not
 * scanned.
 */
function findForbiddenNumbers(brief: Brief): string | null {
  const FORBIDDEN = [
    /\b\d+(\.\d+)?\s*(%|percent|per cent)/i,
    /\b(sentiment|confidence)\s+(score|rating|level)\b/i,
    /\bscore(d|s)?\s+\d+(\.\d+)?\s*(\/|out of)\s*\d+/i,
  ];

  /* Quotes are the client's own words and are reproduced verbatim by design —
     a client who says "40% of our revenue" keeps their sentence. */
  const prose: string[] = [
    brief.readThisFirst.headline,
    brief.readThisFirst.body,
    ...brief.settled.map((s) => s.statement),
    ...brief.unsettled.flatMap((c) => [c.question, c.severityReason, ...c.sides.map((s) => s.position)]),
    ...brief.notDecidedYet.flatMap((g) => [g.topic, g.whatWasSeen, g.consequence]),
    ...brief.forCreativeTeam.vocabulary.map((v) => v.note),
    ...brief.forCreativeTeam.references.flatMap((r) => [...r.reasonsGiven, r.whatItMeans]),
    ...brief.forCreativeTeam.scales.map((s) => s.reading),
    ...brief.forCreativeTeam.notes.flatMap((n) => [n.heading, n.body]),
    brief.signals.alignmentReason,
    ...brief.signals.flags.map((f) => f.finding),
    ...brief.deckOutline.flatMap((d) => [d.title, d.purpose]),
    ...brief.howToRunTheRoom.flatMap((n) => [n.heading, n.body]),
  ];

  for (const line of prose) {
    for (const pattern of FORBIDDEN) {
      const hit = line.match(pattern);
      if (hit) {
        return `The brief contained "${hit[0]}". Percentages and scores are not honest with this few respondents (rule 7), so it was not saved. Run the analysis again.`;
      }
    }
  }
  return null;
}
