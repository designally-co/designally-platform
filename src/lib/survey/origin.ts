import { headers } from 'next/headers';

/**
 * Where a client's survey link points.
 *
 * The link the team copies out of the app has to be the link that works —
 * it goes straight into a message to a client, and a dead one costs a
 * stakeholder's answers with nobody noticing until the kick-off.
 *
 * So it is derived from the host actually serving the app, never assumed.
 * Set SURVEY_ORIGIN once designally.co routes /s/* and /c/* here, and the
 * links become branded without a code change.
 */
export async function surveyOrigin(): Promise<string> {
  const configured = process.env.SURVEY_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
