import type { AnswerValue, QuestionConfig, QuestionType } from '@/lib/db/schema';

/**
 * What a draft holds while the respondent is still typing. Keyed by question
 * ref ("core.9"), not by database id, so a draft survives a question version
 * change and can be read without a database round trip.
 */
export type RawValue =
  | string // paragraph, short_text
  | { choice: string; other?: string } // multiple_choice
  | { choices: string[]; other?: string } // checkboxes
  | { scale: Record<string, number> }; // linear_scale — key is the pair index

export type DraftValues = Record<string, RawValue>;

export function emptyValue(type: QuestionType): RawValue {
  switch (type) {
    case 'paragraph':
    case 'short_text':
      return '';
    case 'multiple_choice':
      return { choice: '' };
    case 'checkboxes':
      return { choices: [] };
    case 'linear_scale':
      return { scale: {} };
  }
}

/**
 * A one-line reading of an answer, for the collapsed row on a question group.
 *
 * The row it appears on is the only proof that question has been answered —
 * there is no tick beside it. `docs/navigation-decisions.md` carries the
 * status in words rather than a glyph, and here the words are the client's
 * own: what they wrote *is* the state.
 *
 * Verbatim and untruncated. The CSS clamps it to a line, so a long answer
 * ellipses at whatever width the screen happens to be rather than at a
 * character count guessed here — and the Thai measured in characters is not
 * the Thai measured in ink.
 */
export function answerPreview(type: QuestionType, raw: RawValue | undefined): string {
  if (!isAnswered(type, raw)) return '';
  switch (type) {
    case 'paragraph':
    case 'short_text':
      return (raw as string).trim();
    case 'multiple_choice': {
      const v = raw as { choice: string; other?: string };
      return v.other?.trim() ? `${v.choice} — ${v.other.trim()}` : v.choice;
    }
    case 'checkboxes': {
      const v = raw as { choices: string[]; other?: string };
      /* the separator the client surface uses between a pair of short strings
         everywhere else — chips, poles, bilingual labels */
      return [...v.choices, v.other?.trim()].filter(Boolean).join(' · ');
    }
    case 'linear_scale':
      /**
       * Unreachable today and deliberately not invented: the only linear_scale
       * step holds that question alone (`steps.ts` — "ten pairs is a screenful,
       * and nothing shares that breath"), so it never collapses. A row of ten
       * positions has no honest one-line reading, and "8 of 10 set" is the
       * shape rule 3 spent a paragraph refusing.
       */
      return '';
  }
}

export function isAnswered(type: QuestionType, raw: RawValue | undefined): boolean {
  if (raw === undefined || raw === null) return false;
  switch (type) {
    case 'paragraph':
    case 'short_text':
      return typeof raw === 'string' && raw.trim().length > 0;
    case 'multiple_choice':
      return typeof raw === 'object' && 'choice' in raw && raw.choice.trim().length > 0;
    case 'checkboxes':
      return typeof raw === 'object' && 'choices' in raw && raw.choices.length > 0;
    case 'linear_scale':
      return typeof raw === 'object' && 'scale' in raw && Object.keys(raw.scale).length > 0;
  }
}

/**
 * Turns a draft value into the tagged shape stored in answers.value. Returns
 * null when nothing was answered — a blank answer is not written as an empty
 * row, it is simply absent, and the analysis reads that absence as a signal
 * (docs/insight-engine-spec.md, "clarity gaps").
 */
export function toAnswerValue(
  type: QuestionType,
  config: QuestionConfig,
  raw: RawValue | undefined,
): AnswerValue | null {
  if (!isAnswered(type, raw)) return null;

  switch (type) {
    case 'paragraph':
    case 'short_text':
      return { kind: 'text', text: (raw as string).trim() };

    case 'multiple_choice': {
      const v = raw as { choice: string; other?: string };
      return {
        kind: 'choice',
        choice: v.choice,
        ...(v.other?.trim() ? { other: v.other.trim() } : {}),
      };
    }

    case 'checkboxes': {
      const v = raw as { choices: string[]; other?: string };
      const max = config.max;
      return {
        kind: 'multi',
        choices: typeof max === 'number' ? v.choices.slice(0, max) : v.choices,
        ...(v.other?.trim() ? { other: v.other.trim() } : {}),
      };
    }

    case 'linear_scale': {
      const v = raw as { scale: Record<string, number> };
      return { kind: 'scale', points: config.points ?? 5, values: v.scale };
    }
  }
}

/** The label a choice is stored as — always the English string, with Thai alongside in the UI. */
export function choiceValue(c: { en: string; th: string; label?: string }): string {
  return c.en;
}
