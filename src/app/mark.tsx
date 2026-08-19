import type { CSSProperties } from 'react';

/**
 * The Designally mark — the D. in its disc.
 *
 * **It replaces the wordmark, 19 August 2026.** `DESIGNALLY.` set in caps was
 * the identity in the toolbar, on the sign-in card and on the survey's two
 * dead-end screens, and it is not an approved lockup. This is, and it is the
 * same object the survey already puts at the head of its Cut — so the tab, the
 * questionnaire and the team app now show one mark rather than three
 * treatments of a name.
 *
 * The geometry is the disc's own, not a second set of numbers: 56% of the
 * diameter, nudged `translate(5%, -1%)` for optical centring. See
 * `.qdisc.markdisc img`, where those three were measured.
 *
 * `size` is the disc's diameter and the only thing a caller sets — the mark
 * inside scales from it. A plain `<img>` for the reason `rail.tsx` gives: two
 * kilobytes with no layout shift to optimise away, and this sits on the first
 * paint of the sign-in page and of a survey that failed to load.
 *
 * The `alt` is the company, not a description of a picture. This carries the
 * name the wordmark used to spell out, and on the dead-end screens it is the
 * only thing on the page that says whose questionnaire it was.
 */
export default function Mark({ size = 30 }: { size?: number }) {
  return (
    <span className="brandmark" style={{ '--brandmark-size': `${size}px` } as CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/designally-mark.png" alt="Designally" width={290} height={256} />
    </span>
  );
}
