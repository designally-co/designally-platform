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
      {n !== null && (
        <b className="qdisc">
          {n}
          <span>/{total}</span>
        </b>
      )}
    </div>
  );
}
