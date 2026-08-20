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

/**
 * The mark with no disc under it — the D in ink, the full stop in the accent.
 *
 * Asked for, 20 August 2026, for the team app's toolbar. On a bar whose other
 * two controls are 44px discs, a *third* disc filled solid orange was the
 * heaviest thing on a page whose subject is a question — and it was fuller
 * than its neighbours besides: the mark takes 56% of its disc where a Lucide
 * glyph takes 45%.
 *
 * **It is the same artwork, not a second asset.** `designally-mark.png` is a
 * white D. on transparency, so it cannot simply be recoloured — but it splits
 * cleanly. Scanned column by column it holds exactly two runs of ink, the D
 * from x9 to x212 and the stop from x216 to x277, with a three-pixel gap
 * between them at 73.79% of the width. Two layers masked by the same file and
 * clipped either side of that gap give each its own colour, and the drawing
 * stays the drawing.
 *
 * The stop takes `--primary-mark`, which is what the retired `DESIGNALLY.`
 * wordmark's full stop took. That is the one piece of this identity that has
 * always been the accent.
 *
 * It measures **2.92:1** on the parchment, the figure DESIGN.md §1 records as
 * crossed by decision for the pure CI orange used as a mark. It is legal here
 * for the reason the section gives: nothing depends on reading it. The whole
 * lockup is one `role="img"` labelled with the company, the D beside it is
 * 15.18:1, and no state, control or word is carried by the stop alone.
 *
 * `role="img"` with the company as its label, for the same reason `Mark` sets
 * an `alt`: this is the only thing in the bar that says whose app it is.
 *
 * `Mark` keeps the disc and is still the right object everywhere it is used —
 * the survey's rail, where it is the Point at the head of the Cut, and the
 * sign-in page, where it stands alone with nothing to be heavy beside.
 */
export function FlatMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="dmark"
      style={{ '--dmark-w': `${size}px` } as CSSProperties}
      role="img"
      aria-label="Designally"
    >
      <i className="dm-d" />
      <i className="dm-dot" />
    </span>
  );
}
