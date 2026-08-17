'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The team app's toolbar.
 *
 * Built against Apple's Human Interface Guidelines for toolbars, read on
 * 17 August 2026, and deliberately not built against all of it. What the HIG
 * says a toolbar holds is three things — the title of the current view,
 * navigation, and actions — in three slots: leading, center, trailing.
 *
 * What was taken:
 *
 * - **The large-title pattern.** "A large title transitions to a standard title
 *   as people begin scrolling the content." The page's greeting *is* a large
 *   title, and it left the screen at 161px taking the answer to "is there
 *   anything I have to do" with it, while the project table ran on for ten
 *   rows. The bar now catches it.
 * - **One primary action, on the trailing edge.** `New survey` was already the
 *   only prominent control, but Sign out sat after it, so the bar ended on the
 *   least important thing in the app. It is last now.
 * - **A More menu for the rest.** "Prioritize less important actions for
 *   inclusion in the More menu." Sign out and Past projects are both that.
 * - **Fixed space between text labels**, which the HIG asks for by name: two
 *   labelled buttons side by side read as one control.
 * - **No custom background.** "Reduce the use of toolbar backgrounds and tinted
 *   controls… use the content layer to inform the color and appearance of the
 *   toolbar, and use a ScrollEdgeEffectStyle when necessary to distinguish the
 *   toolbar area from the content area." The bar was a hardcoded
 *   `rgba(245,245,247,0.8)` behind a 20px blur — a cool grey that was not in
 *   this brand at all, over a warm parchment page. It is the page's own colour
 *   now, and the hairline is the scroll edge effect: it appears when there is
 *   content underneath it and not before.
 *
 * What was refused:
 *
 * - **Symbols instead of labels.** "Prefer simple, recognizable symbols for
 *   items instead of text." `docs/navigation-decisions.md` says the opposite
 *   and is right for this product: "a bare glyph needs a legend where words do
 *   not." Words stay.
 * - Bottom toolbars, tab bars, and customization. The product has one place;
 *   a tab bar would be a lie about that, and five people with two actions have
 *   nothing to customize.
 *
 * The date keeps the title slot while the greeting is on screen and hands it
 * over on scroll. Both are orientation and only one is needed at a time, so
 * they share the slot rather than competing for the bar.
 */
export default function Toolbar({
  today,
  needsCount,
  onNewSurvey,
  onPastProjects,
  archivedCount,
  signOut,
}: {
  today: string;
  needsCount: number;
  onNewSurvey: () => void;
  onPastProjects: () => void;
  archivedCount: number;
  signOut: () => Promise<void>;
}) {
  /* true once the greeting has scrolled under the bar */
  const [past, setPast] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const greet = document.querySelector('.greet');
    const bar = barRef.current;
    if (!greet || !bar) return;
    /* IntersectionObserver rather than a scroll listener: the browser reports
       the crossing itself instead of the main thread measuring every frame.

       The margin is the bar's own height, measured rather than guessed — the
       handover has to happen when the greeting goes under the bar, and a
       hardcoded number is wrong the moment the bar wraps on a narrow window. */
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting), {
      rootMargin: `-${Math.round(bar.getBoundingClientRect().height)}px 0px 0px 0px`,
    });
    io.observe(greet);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menu) return;
    const away = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  /**
   * The title names where you are, in the app's own words: "Needs you" is what
   * the section beneath is called, so the bar does not invent a second name for
   * it. Short, as the HIG asks — it caps a toolbar title at fifteen characters
   * to leave room for controls.
   */
  const title = needsCount === 0 ? 'Nothing needs you' : `Needs you · ${needsCount}`;

  return (
    <header className={past ? 'topbar past' : 'topbar'} ref={barRef}>
      <div className="inner">
        {/* leading — identity, then the title slot beside it */}
        <span className="wordmark">
          Design<em>ally</em>
        </span>
        <span className="barttl" aria-live="polite">
          <span className={past ? 'ttl on' : 'ttl'}>{title}</span>
          <span className={past ? 'ttl' : 'ttl on'}>{today}</span>
        </span>

        {/* trailing — the More menu, then the one primary action */}
        <div className="bartrail" ref={menuRef}>
          <button
            className="linkish"
            aria-expanded={menu}
            aria-haspopup="true"
            onClick={() => setMenu((m) => !m)}
          >
            More
          </button>
          {menu && (
            <div className="barmenu">
              <button
                onClick={() => {
                  setMenu(false);
                  onPastProjects();
                }}
              >
                Past projects
                <small>{archivedCount} archived · insights stay searchable</small>
              </button>
              <form action={signOut}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={onNewSurvey}>
            New survey
          </button>
        </div>
      </div>
    </header>
  );
}
