/**
 * The chevron. One mark, drawn once.
 *
 * It was defined inside the survey form and is shared from 17 August 2026,
 * when the team app's sheets took a back control of their own — Apple's HIG:
 * "Use the standard Back and Close buttons… Prefer the standard symbols for
 * each, and don't use a text label that says Back or Close." Two chevrons drawn
 * twice would have drifted, and this one carries an optical correction that
 * would not have survived being redrawn from scratch.
 */
export default function Chevron({ up, back }: { up?: boolean; back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d={
          back
            ? 'M16.5 3 L7.5 12 L16.5 21'
            : up
              ? 'M3 16.5 L12 7.5 L21 16.5'
              : 'M3 7.5 L12 16.5 L21 7.5'
        }
        /* Centred by eye, not by box, and the eye wants it moved *toward* the
           point.
           A chevron's open end spreads two strokes apart and covers area; its
           apex is a single node covering almost none. The perceived weight is
           therefore at the open end, so a box-centred chevron reads as pushed
           that way — and with the apex landing near the middle of a disc it
           stops being an arrow and becomes a clock hand.
           1.5px toward the point, judged against a centre line at 1, 0, -1,
           -1.5, -2 and -2.5: at 0 the apex sits on the line, and by -2 the mark
           has visibly overshot. */
        transform={back ? 'translate(-1.5 0)' : up ? 'translate(0 -1.5)' : 'translate(0 1.5)'}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
