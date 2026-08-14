import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, Poppins, Zalando_Sans } from 'next/font/google';
import './globals.css';

/**
 * The three Designally faces, self-hosted.
 *
 * The design system loads all three from Google Fonts through an `@import`
 * inside a stylesheet. That is the worst available shape for this product: a
 * CSS `@import` is serialised, so the browser fetches the stylesheet, parses
 * it, and only then discovers the fonts — and the survey is answered on a
 * phone, in Thai, on a poor connection, by somebody with no reason to wait.
 *
 * `next/font` self-hosts them at build time, splits them by `unicode-range`,
 * preloads them from our own origin, and — the reason it beats hand-written
 * `@font-face` here — generates a metric-matched fallback so the page does not
 * reflow when the real face swaps in. A twenty-question form that jumps while
 * you are reading question three is the failure this avoids.
 *
 * **Zalando Sans has no Thai.** The system's readme says it covers Latin and
 * Thai; Google publishes it in latin, latin-ext and vietnamese only, and
 * next/font's own font data agrees. Thai display therefore resolves to IBM
 * Plex Sans Thai at 700 — a real weight, not a synthesised one, because
 * faux-bolding Thai thickens the tone marks into the glyph above.
 *
 * The fallback is per codepoint, so a bilingual string resolves correctly
 * inside one run of text. Never split one across elements to "help" it.
 */
const zalando = Zalando_Sans({
  variable: '--font-zalando',
  subsets: ['latin', 'latin-ext'],
  weight: 'variable',
  display: 'swap',
});

/* Body copy, Latin. The CI sets body at Light 300. */
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400'],
  display: 'swap',
});

/* Body *and* display for Thai: 300 body, 400 emphasis, 500 label, 700 heading. */
const plexThai = IBM_Plex_Sans_Thai({
  variable: '--font-plex-thai',
  subsets: ['thai'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Designally',
  description: 'Designally platform',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${zalando.variable} ${poppins.variable} ${plexThai.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
