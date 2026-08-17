'use client';

import type { CSSProperties } from 'react';

/**
 * The Cut, stood up — and the progress with it.
 *
 * A hairline down the right edge of every screen, fixed, with the CI's point
 * riding it and the count riding the point. Where the client is in the
 * questionnaire is the point's height on the line, and nothing else on the
 * screen carries progress: the horizontal Cut under the masthead is gone.
 *
 * `PointRule.jsx` in the CI ships `orientation="vertical"` and its own example
 * is `length="100%"`, so this is the brand's own object at the size the brand
 * drew it. The line does not fill behind the point — the point is the reading,
 * which is what makes this a rail rather than a progress bar rotated.
 *
 * **It counts questions, not screens.** The masthead counted screens because a
 * screen held two to four questions at once and `DESIGN.md` was right that
 * "8/21 while looking at three questions is a riddle". A screen shows one
 * question at a time now, so the client really is on question 8, and the
 * questionnaire can count the thing the welcome screen actually promises. The
 * point moves *within* a screen as each question opens, so progress is
 * continuous rather than nine jumps.
 *
 * **Fixed, not sticky.** The line and the point hold still while the page
 * moves under them — asked for directly, and it is what makes the point's
 * height mean something: a mark that scrolled would be measuring the scroll.
 *
 * Positioned by `translateY` on a full-height carrier hung at its bottom edge,
 * translated by `at − 1`. A percentage in a transform resolves against the
 * element's own box, so the carrier moves the point exactly `at` down the rail,
 * on the compositor. Hung at the top and translated by `at`, the arithmetic is
 * the same and the carrier hangs a rail's height below the fold.
 */
export default function Rail({ n, total }: { n: number | null; total: number }) {
  return (
    <div className="qrail" aria-hidden="true">
      <i style={{ '--at': n === null ? 0 : n / total } as CSSProperties}>
        {n !== null && (
          <b>
            {n}
            <em>/{total}</em>
          </b>
        )}
      </i>
    </div>
  );
}
