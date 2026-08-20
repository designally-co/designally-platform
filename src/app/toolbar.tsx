'use client';

import Mark from './mark';

import { BellMark } from './icons';
import MoreMenu from './menu';
import type { ProjectView } from '@/lib/team/projects';

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
 * - **Symbols instead of labels, for actions.** "Prefer simple, recognizable
 *   symbols for items instead of text." `docs/navigation-decisions.md` says the
 *   opposite and is right for this product: "a bare glyph needs a legend where
 *   words do not." Words stay — for actions. The way out of a sheet is the one
 *   exception and is a chevron, because the HIG names Back and Close as
 *   standard symbols and every machine already teaches them; see sheets/sheet.tsx.
 *   This bar is the root of the app and has nothing to go back to, so it has no
 *   such control.
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
  needs,
  onOpenProject,
  onNewSurvey,
  onPastProjects,
  archivedCount,
  signOut,
}: {
  today: string;
  /** every live project with something outstanding, newest concern first */
  needs: ProjectView[];
  onOpenProject: (id: string) => void;
  onNewSurvey: () => void;
  onPastProjects: () => void;
  archivedCount: number;
  signOut: () => Promise<void>;
}) {
  /**
   * The scroll handover went on 20 August 2026, with the section it served.
   *
   * The bar used to swap the date for "Needs you · 2" once the greeting passed
   * under it, on the HIG's large-title pattern: the answer to "is there
   * anything I have to do" left the screen at 161px while the project list ran
   * on, so the bar caught it. An `IntersectionObserver`, a measured root
   * margin, and two spans cross-fading.
   *
   * The bell is a better answer to the same problem and it is always there.
   * It holds the count at every scroll position rather than only past one, it
   * can be pressed, and what it opens is the work itself. Keeping both would
   * put the same number in two places four inches apart.
   *
   * The date keeps the title slot outright now, which is what a title slot is
   * for.
   */
  const bellLabel =
    needs.length === 0
      ? 'Notifications — nothing is waiting'
      : `Notifications — ${needs.length} waiting`;

  return (
    <header className="topbar">
      <div className="inner">
        {/* leading — identity, then the title slot beside it */}
        <Mark size={30} />
        <span className="barttl">
          <span className="ttl on">{today}</span>
        </span>

        {/* trailing — notifications, the More menu, then the one primary action */}
        <div className="bartrail">
          {/**
           * The bell, and the whole of what the *Needs you* section used to be.
           *
           * It is `MoreMenu` with a different mark, deliberately: that component
           * is already this app's popover — Escape, click-away, `aria-expanded`,
           * and a `.barmenu` of title-and-`<small>` rows — and a second one
           * written beside it would drift from it within a week. The HIG's own
           * reason for one More menu across two toolbars is the reason for one
           * popover across two jobs.
           *
           * **The rows do not act; they open.** Every action a notification
           * could offer — write the insights, review them, close collection —
           * already exists in the project sheet, and a button that appears in
           * two places is two places to keep true. Pressing a row opens the
           * project it is about, which is where the work is done and where the
           * rest of the context already is.
           *
           * **Nothing is stored and there is no unread.** The list is derived
           * from what is true right now — the same `action` the page reads — so
           * it cannot go stale, cannot need marking as read, and needs no table.
           * It is not a log of what happened; it is what is waiting.
           */}
          <MoreMenu label={bellLabel} icon={<BellMark />} badge={needs.length} menuClass="notes">
            {(close) =>
              needs.length === 0 ? (
                /* Principle 2 — an empty screen is success. Say so and stop. */
                <p className="barnote">Nothing is waiting.</p>
              ) : (
                needs.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      close();
                      onOpenProject(p.id);
                    }}
                  >
                    {p.clientName}
                    <small>{p.action!.say}</small>
                  </button>
                ))
              )
            }
          </MoreMenu>
          <MoreMenu>
            {(close) => (
              <>
                <button
                  onClick={() => {
                    close();
                    onPastProjects();
                  }}
                >
                  Past projects
                  <small>{archivedCount} archived · insights stay searchable</small>
                </button>
                <form action={signOut}>
                  <button type="submit">Sign out</button>
                </form>
              </>
            )}
          </MoreMenu>
          <button className="btn btn-primary" onClick={onNewSurvey}>
            New survey
          </button>
        </div>
      </div>
    </header>
  );
}
