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
