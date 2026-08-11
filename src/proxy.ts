import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two surfaces, one app.
 *
 * Public — `/s/<token>` and `/c/<token>`, the client surveys. No login, and
 * they must keep working on a phone in Thailand.
 *
 * Private — everything else. Designally staff only.
 *
 * This only checks that a session cookie exists, so an expired or forged
 * cookie still reaches the page. The pages themselves call `auth()` and are
 * the real gate; this exists so a signed-out visitor is redirected rather than
 * shown a flash of the team app.
 */
/**
 * `/moodboard/` is here because a public page's images are public too.
 *
 * The image optimiser fetches the source file back through this same app over
 * HTTP, so the request arrives here with no session and was redirected to
 * `/sign-in`. Next then read an HTML page where a PNG should be and returned
 * 400, which renders as an empty box — the client would have been asked to
 * choose between six blank cards with no error anywhere they could see.
 */
const PUBLIC_PREFIXES = ['/s/', '/c/', '/api/s/', '/api/c/', '/api/auth/', '/moodboard/'];
const PUBLIC_EXACT = ['/sign-in'];

const SESSION_COOKIES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_EXACT.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (signedIn) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/sign-in';
  url.search = pathname === '/' ? '' : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
