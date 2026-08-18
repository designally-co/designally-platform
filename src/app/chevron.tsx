/**
 * The chevron. One mark, drawn once.
 *
 * The survey's, and only the survey's, from 18 August 2026. It was shared with
 * the team app's sheets for a day; those took Lucide's `ChevronLeft` through the
 * same wrapper as every other mark on that toolbar, because at 24px and stroke
 * 2.5 this one sat beside three 20px marks at 1.9 and read as a size larger —
 * see `BackMark` in icons.tsx.
 *
 * It stays here because the survey's back control is a 52px disc and DESIGN.md
 * §5 scales the glyph with it: 24px there is a decision, not this value left
 * unexamined. And it keeps Lucide out of a bundle answered on a phone, in Thai,
 * on a poor connection.
 *
 * The optical correction below went with the mark to the team app as a 1px
 * transform in CSS — the finding is about the shape, not the drawing.
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
