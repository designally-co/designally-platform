/**
 * Pure helpers for survey links — safe in a client component. The server-only
 * `surveyOrigin()` lives in origin.ts, which reads request headers and must
 * never be pulled into the browser bundle.
 */

/** Strips the scheme for display — the team reads these, and https:// is noise. */
export function forDisplay(url: string) {
  return url.replace(/^https?:\/\//, '');
}
