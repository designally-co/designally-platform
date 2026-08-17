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
 * The disc itself — a count, or the mark when there is nothing to count yet.
 *
 * Before the questions start, the disc read `0/9`. Zero of nine is honest and
 * it is also the least interesting thing the brand's own object could be doing
 * on the two screens a client sees first. So on the welcome and the identity
 * screen it carries the Designally mark instead, and it becomes a counter at
 * the first question and stays one to the end.
 *
 * The mark is knocked out white and sits on the same `--primary` disc, so the
 * object does not change shape or colour between screens — only what is inside
 * it. It is the *inverse* of the mark as drawn: the D reads white, the counter
 * and the Point read as the disc showing through, which is what puts the CI's
 * own orange inside its own mark at 54px without asking a 2.92:1 orange to
 * hold an edge.
 *
 * It is `aria-hidden` all the way up at `.qrail`, so no alt text is owed: a
 * screen reader is told where it is by the questions, not by a graphic.
 */
export function Disc({ n, total, className }: { n: number; total: number; className?: string }) {
  const cls = className ? `qdisc ${className}` : 'qdisc';
  if (n === 0) {
    return (
      <b className={`${cls} markdisc`} aria-hidden="true">
        {/* plain <img>: 274px of 1.5KB PNG, no layout shift to optimise away,
            and next/image would put a fetch in front of a mark that is on the
            first paint of the first screen */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/designally-mark.png" alt="" width={274} height={284} />
      </b>
    );
  }
  return (
    <b className={cls} aria-hidden="true">
      {n}
      <span>/{total}</span>
    </b>
  );
}
