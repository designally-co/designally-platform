'use client';

/**
 * The questionnaire as one object — the CI's **Structure** idiom.
 *
 * *Point & line* is the brand's graphic system, and `guidelines/brand-point-line.html`
 * names six things it does: the point, scale, line, connection, focus, and a
 * grid of points it calls structure. This is that grid, carrying the one fact
 * the survey could never show a client: **how much of it there is, and how much
 * of it they have done** — twenty-one questions in three rows of seven, filled
 * where an answer exists and hollow where one does not.
 *
 * It replaces a list of blanks on the send screen. The list named what was
 * missing and nothing else: you could read it and still not know whether two
 * blanks out of twenty-one was nearly finished or barely started. The grid
 * answers both at a glance, and every point is a way back to its question.
 *
 * **The points are `--primary-mark`, not the CI's `#ef6148`.** DESIGN.md §1
 * measured the CI's own point colour at 2.92:1 on warm white. The Cut carries
 * it because nothing is read from the Cut — it has weight, not information.
 * These are read from, so they take the measured orange at 4.54:1. A hollow
 * point is a hairline ring, which is the Edge doing what the Edge does.
 *
 * Not a progress bar, and it does not compete with one: the Cut measures
 * *screens*, this counts *questions*, and they appear on different screens.
 */

export type GridPoint = {
  /** the number the client saw beside the question */
  n: number;
  ref: string;
  /** which screen it lives on, for the way back */
  step: number;
  answered: boolean;
  /** what it asks, for the accessible name and the tooltip */
  text: string;
};

export default function QuestionGrid({
  points,
  onPick,
}: {
  points: GridPoint[];
  /**
   * Given, every point is a button back to its question. Omitted, the grid is
   * a picture and nothing more — which is what it is on the welcome and the
   * completion, where there is nowhere to go back to.
   */
  onPick?: (step: number, ref: string) => void;
}) {
  if (!points.length) return null;

  return (
    <ul className={onPick ? 'qgrid pick' : 'qgrid'}>
      {points.map((p) => {
        /* The name a screen reader gets, and the tooltip a cursor gets. The
           list this replaced showed each question's text, so the text has to
           survive somewhere — it is here rather than on screen, because
           twenty-one questions of it on screen is the list again. */
        const label = `${p.n}. ${p.text} — ${p.answered ? 'answered' : 'not answered yet'}`;
        return (
          <li key={p.ref}>
            {onPick ? (
              <button
                type="button"
                className={p.answered ? 'pt on' : 'pt'}
                title={label}
                aria-label={label}
                onClick={() => onPick(p.step, p.ref)}
              >
                <i aria-hidden="true" />
              </button>
            ) : (
              <span className={p.answered ? 'pt on' : 'pt'} aria-hidden="true">
                <i />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
