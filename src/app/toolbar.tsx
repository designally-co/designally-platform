'use client';

import Mark from './mark';

import { BellMark, SettingsMark } from './icons';
import MoreMenu from './menu';
import type { ProjectView } from '@/lib/team/projects';

/**
 * The team app's toolbar — three things, 20 August 2026.
 *
 * The mark at the leading edge, and notifications and settings at the trailing
 * one. Nothing else: no title, no date, no More menu, and no primary action.
 *
 * It had all four. What happened to each is worth recording, because none of
 * them was dropped for room:
 *
 * - **The date** went with the title slot. It was there on the HIG's reasoning
 *   that a toolbar names the current view, and this app has one view — so the
 *   slot held the date, which is orientation every machine this runs on already
 *   provides. It had also stopped fitting: the bell took the width it was
 *   surviving on and "Thursday 20 August" ellipsised to "Thurs…".
 * - **The title's scroll handover** — the slot swapped the date for
 *   "Needs you · 1" once the greeting passed under the bar — went with the
 *   section it counted. The bell answers the same question at every scroll
 *   position rather than only past one, it can be pressed, and what it opens is
 *   the work itself.
 * - **New survey** moved into the page, under the headline that asks for it.
 *   A toolbar's trailing edge is where the HIG puts the one primary action, and
 *   that is right when the page has other subjects. This page has one — the
 *   invitation to send a questionnaire — and the button belongs with the
 *   sentence that makes it.
 * - **The More menu** held Past projects and Sign out. Past projects is now a
 *   control on the sheet that lists the live ones, beside the search that
 *   filters them; Sign out is in Settings, which is where a person looks for
 *   it. A More menu with nothing left in it is a menu about nothing.
 *
 * What the HIG asked for that this still does: one leading identity, actions on
 * the trailing edge, no background of its own, and a hairline that appears only
 * when there is content under it.
 */
export default function Toolbar({
  needs,
  onOpenProject,
  onSettings,
}: {
  /** every live project with something outstanding */
  needs: ProjectView[];
  onOpenProject: (id: string) => void;
  onSettings: () => void;
}) {
  const bellLabel =
    needs.length === 0
      ? 'Notifications — nothing is waiting'
      : `Notifications — ${needs.length} waiting`;

  return (
    <header className="topbar">
      <div className="inner">
        <Mark size={30} />

        <div className="bartrail">
          {/**
           * The bell, and the whole of what the *Needs you* section used to be.
           *
           * It is `MoreMenu` with a different mark, deliberately: that component
           * is already this app's popover — Escape, click-away, `aria-expanded`,
           * and a `.barmenu` of title-and-`<small>` rows — and a second one
           * written beside it would drift from it within a week.
           *
           * **The rows do not act; they open.** Every action a notification
           * could offer — write the insights, review them, close collection —
           * already exists in the project sheet, and a button that appears in
           * two places is two places to keep true.
           *
           * **Nothing is stored and there is no unread.** The list is derived
           * from what is true right now — the same `action` the cards read — so
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

          {/* Settings — a sheet, not a menu. What it holds is two lines of
              reading and one control, which is a page rather than a list of
              things to press. */}
          <button className="iconbtn" aria-label="Settings" title="Settings" onClick={onSettings}>
            <SettingsMark />
          </button>
        </div>
      </div>
    </header>
  );
}
