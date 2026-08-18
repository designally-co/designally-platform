'use client';

/**
 * The Cut, stood up — and the count sitting on it.
 *
 * A full-height orange line down the left of every survey screen with a filled
 * disc crossing it near the top, the question count inside the disc. The line
 * is the CI's Cut at `orientation="vertical"`; the disc is its Point, at the
 * size a brand mark wants rather than the 8px a progress head wants.
 *
 * **Nothing here moves.** An earlier build had the point sliding down the line
 * as a progress head — the count read off its height. It holds still now and
 * the number inside it changes instead: the graphic is a fixture of the screen,
 * the way a masthead is, and progress is read rather than measured. Asked for
 * directly, and it settles what the line is for — it is the brand's mark, not a
 * track, so it runs its full length on every screen and never fills.
 *
 * **The disc is `--primary`, not the CI's `#ef6148`.** DESIGN.md §1 measured
 * the CI's orange at 3.24:1 under white, which is why it cannot carry a button
 * label — and this disc carries white numerals, which is the same job. The line
 * beside it keeps the pure CI orange, because nothing is read from a line.
 *
 * It counts questions, not screens: a screen opens one question at a time, so
 * the client really is on question 8 of 21, which is the number the welcome
 * screen promised them.
 */
export default function Rail({ n, total }: { n: number | null; total: number }) {
  return (
    <div className="qrail" aria-hidden="true">
      {n !== null && <Disc n={n} total={total} />}
    </div>
  );
}

/**
 * The disc itself — a count, or nothing at all before there is anything to
 * count.
 *
 * The welcome and the identity screen come before question one, so the disc has
 * no number to hold. It read `0/9` at first, which is honest and dull; then it
 * carried the Designally mark, knocked out white; it is empty now, asked for on
 * 18 August 2026.
 *
 * Empty is not a gap. The disc *is* the Point — one of the CI's five pieces,
 * and DESIGN.md gives it "the head of the Cut" as its first job. On these two
 * screens that is exactly what it is doing: the head of a line that has not
 * started measuring. It fills with a number at question one and stays a counter
 * to the end, and the object never changes shape or colour on the way — only
 * what is inside it.
 *
 * `aria-hidden` all the way up at `.qrail`, so nothing is owed a label: a
 * screen reader is told where it is by the questions, not by a graphic.
 */
export function Disc({ n, total, className }: { n: number; total: number; className?: string }) {
  const cls = className ? `qdisc ${className}` : 'qdisc';
  if (n === 0) return <b className={cls} aria-hidden="true" />;
  return (
    <b className={cls} aria-hidden="true">
      {n}
      <span>/{total}</span>
    </b>
  );
}
