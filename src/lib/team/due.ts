/**
 * The date the team asks a client to answer by.
 *
 * Its own module because the New survey sheet is a client component and needs
 * the default to prefill the field. `projects.ts`, where this used to live,
 * opens a database connection — importing one constant from there would drag
 * the Postgres driver into the browser bundle. Same reason `library-types.ts`
 * is separate from `library.ts`.
 *
 * It is a date, not a deadline the software enforces: rule 1 says nothing
 * happens on a timer. Past it the project appears in Needs you and a person
 * decides. Answers arriving after it are accepted.
 */

/** The team works in Bangkok; dates are theirs, not the server's. */
export const TZ = 'Asia/Bangkok';

/** What the field is prefilled with, and what the branding team asked for. */
export const DEFAULT_DUE_DAYS = 14;

/**
 * A date as `YYYY-MM-DD` in Bangkok — what `<input type="date">` reads and
 * writes. `en-CA` is the locale that formats that way; the timezone keeps the
 * day from sliding backwards for anyone whose machine is west of here.
 */
export function dayIn(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

/** Today in Bangkok, plus the default. */
export function defaultDueDay(now: Date = new Date()): string {
  return dayIn(new Date(now.getTime() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000));
}

/**
 * `YYYY-MM-DD` → the last moment of that day in Bangkok.
 *
 * +07:00 is Bangkok and does not observe daylight saving, so a fixed offset is
 * correct here rather than a lie that happens to work half the year.
 */
export function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:59+07:00`);
}
