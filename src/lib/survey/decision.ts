/**
 * Whether a respondent claimed final decision authority.
 *
 * The identity block's third question offers "Yes — final decisions come to
 * me", "Shared — we decide as a group" and "No — I contribute my perspective".
 * Only the first is a named decision maker. Shared authority is real and is not
 * the same thing: it means nobody in the room can settle a conflict alone,
 * which is exactly what the kick-off needs to know.
 *
 * Pure, so both the analysis and the team app can use it.
 */
export function claimsDecision(answer: string | null | undefined) {
  return typeof answer === 'string' && answer.trim().toLowerCase().startsWith('yes');
}
