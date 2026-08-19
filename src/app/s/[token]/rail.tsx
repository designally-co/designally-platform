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
 * **The disc is the CI's `#ef6148`, and its numerals are charcoal.** It was
 * `--primary` (`#c73f29`) with white numerals, which put a second orange
 * touching the first: the Cut runs through this disc, so the two sat edge to
 * edge and read as a mistake rather than as a system. One orange on this
 * surface, asked for 19 August 2026.
 *
 * The numerals had to move for it. White on `#ef6148` is **3.24:1** — DESIGN.md
 * §1 measured it and that is the whole reason the CI orange cannot carry a
 * button label. Charcoal on it is **5.19:1**, which is the other of the two
 * places §1 calls the pure orange legal: *with charcoal on top of it*.
 *
 * It counts **screens** — the group of two to four questions in front of you,
 * out of the nine the run is made of.
 *
 * This comment claimed questions for a long time, which was true only while a
 * screen opened one at a time. Grouping made it false and nothing noticed: the
 * disc read `8/9` while the welcome promised twenty-one. Settled on 19 August
 * 2026 — the disc measures groups, and the welcome counts the same groups
 * rather than the questions inside them.
 */
export default function Rail({
  n,
  total,
  mark = false,
}: {
  n: number | null;
  total: number;
  /** the welcome screen, and only it — see `Disc` */
  mark?: boolean;
}) {
  return (
    <div className="qrail" aria-hidden="true">
      {n !== null && <Disc n={n} total={total} mark={mark} />}
    </div>
  );
}

/**
 * The disc itself — a count, or nothing at all before there is anything to
 * count.
 *
 * The welcome and the identity screen come before question one, so the disc has
 * no number to hold. It read `0/9` at first; then the Designally mark; then
 * nothing at all from 18 August 2026.
 *
 * **The mark is back on the welcome, and only there** — 19 August 2026. That
 * screen is the first thing a client ever sees of Designally and the one place
 * a brand mark is doing a job rather than decorating a counter. The identity
 * screen keeps the empty disc: it is one screen further in, the client has
 * already been introduced, and a mark repeated on the way to the questions is
 * the brand talking over itself.
 *
 * Empty is still not a gap where it stays empty. The disc *is* the Point — one
 * of the CI's five pieces, and DESIGN.md gives it "the head of the Cut" as its
 * first job. It fills with a number at question one and stays a counter to the
 * end, and the object never changes shape or colour on the way — only what is
 * inside it.
 *
 * `aria-hidden` all the way up at `.qrail`, so nothing is owed a label: a
 * screen reader is told where it is by the questions, not by a graphic.
 */
export function Disc({
  n,
  total,
  className,
  mark = false,
}: {
  n: number;
  total: number;
  className?: string;
  mark?: boolean;
}) {
  const cls = className ? `qdisc ${className}` : 'qdisc';
  if (n === 0) {
    if (!mark) return <b className={cls} aria-hidden="true" />;
    return (
      <b className={`${cls} markdisc`} aria-hidden="true">
        {/* The intrinsic size matters: a browser derives `aspect-ratio` from
            these two attributes, so leaving the previous art's 274x284 on a
            290x256 file stretched the mark taller and narrower than it is. */}
        {/* plain <img>: 5KB of PNG with no layout shift to optimise away, and
            next/image would put a fetch in front of a mark that is on the first
            paint of the first screen a client ever sees */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/designally-mark.png" alt="" width={290} height={256} />
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
