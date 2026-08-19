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
 * Does this look like somebody's email address?
 *
 * **A format check, not a verification.** It says the string is shaped like an
 * address; it cannot say anybody reads it. Nothing here can: this platform
 * never sends email — PRODUCT.md, "there is no email from the platform, ever" —
 * so there is no confirmation loop to close, and an MX lookup would only prove
 * the domain exists, not the mailbox. `khun@gmial.com` passes and always will.
 * What this catches is the typo somebody can see once it is pointed at: `abcd`,
 * a missing `@`, a domain with no dot.
 *
 * **Deliberately forgiving.** It is on the road between a client and twenty
 * minutes of their work, on a phone, and a false rejection there costs far more
 * than a bad address in a contact column. So it takes anything with one `@`, a
 * non-empty local part, and a dotted domain ending in two or more letters.
 * Addresses this rejects that RFC 5322 allows — an IP-literal domain, a quoted
 * local part, a single-label host — are not addresses a client types on a
 * phone, and the trade is made knowingly rather than by picking the shortest
 * regex.
 *
 * One rule, used by the identity gate in `survey-form.tsx` and again by the
 * submit route, so the two cannot disagree about what passes.
 */
export function looksLikeEmail(raw: string): boolean {
  const v = raw.trim();
  /* 254 is the length a mailbox may actually have. Anything longer is a paste
     accident, and worth catching before it becomes a column nobody can read. */
  if (!v || v.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v);
}

/**
 * Misspellings of the handful of mail hosts a client actually uses.
 *
 * **Every one of these is a domain where a mailbox cannot exist**, which is
 * what lets the identity step refuse them rather than merely suggest. `gmial
 * .com` is nobody\'s mail host; `gmail.co` is a defensive registration Google
 * does not serve mail on. Being in this map is a statement, not a guess, so
 * anything uncertain stays out of it — the cost of a wrong entry is now a
 * client locked out of their own address.
 *
 * **Exact domains only, never a pattern.** The tempting rule is "`.co` at the
 * end of a mail host probably wanted `.com`" and it would be a disaster here:
 * `.co` is a real TLD, this product's own survey lives at `s.designally.co`,
 * and Thai companies run `.co.th`. A map of exact strings cannot produce that
 * class of false positive — the worst it can do is fail to notice a typo, which
 * costs nothing because it was only ever a suggestion.
 */
const TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'homail.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outook.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  /* `hotmail.co.th` was in this list and is out again: Microsoft ran
     country-coded Hotmail domains for years and I cannot say from here whether
     Thailand was one of them. A wrong entry was merely annoying while this only
     suggested; now that it refuses, a wrong entry is a client locked out of
     their own address. Nothing goes in here that is not certain. */
};

/**
 * The address this one was probably meant to be, or null.
 *
 * A nudge and never a rule: `looksLikeEmail` decides whether somebody may move
 * on, and this decides nothing at all. It cannot verify that a mailbox exists —
 * nothing in this product can, because it never sends email — so it does the
 * one thing that is possible without leaving the browser, which is to notice
 * that a domain is one letter away from a very common one.
 *
 * The local part is returned untouched. `somchai@gmial.com` becomes
 * `somchai@gmail.com`; a wrong name at a right domain is invisible here and
 * always will be.
 */
export function suggestEmailFix(raw: string): string | null {
  const v = raw.trim();
  const at = v.lastIndexOf('@');
  if (at < 1) return null;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1).toLowerCase();
  const fixed = TYPO_DOMAINS[domain];
  return fixed ? `${local}@${fixed}` : null;
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
