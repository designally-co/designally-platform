'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { BackMark, CloseMark } from '../icons';

/**
 * A full-screen dialog on the parchment page, entering with an 18px rise.
 * DESIGN.md §5.
 *
 * A native <dialog> gives the focus trap, the Escape key and inertness for
 * free — worth more than the markup it costs.
 *
 * **The header is a toolbar**, in the HIG's three slots: back · title ·
 * actions. The way out is a chevron disc at the far leading edge, which is
 * where the HIG puts it — "Elements that let people return to the previous
 * document … appear at the far leading edge, followed by the view title" — and
 * a symbol rather than a word, which is the one place this product spends a
 * glyph: "Use the standard Back and Close buttons. People know that the
 * standard Back button lets them retrace their steps … Prefer the standard
 * symbols for each, and don't use a text label that says Back or Close."
 *
 * It was a text `Close` pill on the trailing edge until 17 August 2026, which
 * put the way out in the same group as the things you can *do* here.
 *
 * `docs/navigation-decisions.md` bans a bare glyph, and the ban holds where it
 * was aimed — at *status*, the star beside a name, which needs a legend because
 * nothing teaches it. A back chevron is taught by every phone and window on
 * the machine, and it is a control, not a reading. The disc it sits in is the
 * survey's own back control, the same object at the same size.
 *
 * `onClose` is what back does, and it is a real step back rather than a
 * dismissal: the answers sheet returns to the project it was opened from, not
 * to the landing page behind it — see today.tsx.
 */
export default function Sheet({
  title,
  narrow = false,
  width,
  surface,
  hideClose = false,
  dismiss = false,
  bare = false,
  actions,
  backLabel = 'Back',
  onClose,
  children,
}: {
  title: ReactNode;
  narrow?: boolean;
  /** an extra width class, for a sheet cut to the one column it holds */
  width?: string;
  /**
   * An extra class on `.sheet`, for a sheet that carries its own ground.
   *
   * `paper` is the one there is: white where the other sheets are parchment,
   * because those sheets are nearly all cards and the grey between them stopped
   * reading as a page. `.sheet.paper` in globals.css swaps the two volumes over
   * in three custom properties, and everything inside inherits them — which is
   * why this is a class on the sheet rather than a prop threaded through its
   * children.
   *
   * It was called `pd`, for the project detail sheet, until the insights sheet
   * took it too. A surface class that names one screen stops being true the
   * second a second screen wants it.
   */
  surface?: string;
  /**
   * A bare sheet that provides its own way out, so it draws no close disc.
   *
   * `bare` means no top bar, which is why it grew a floating close in the first
   * place — there is no back chevron to leave by. A form that ends in Cancel
   * beside its primary has one, and two exits eight hundred pixels apart are
   * one more than the sheet needs.
   *
   * It also puts `noclose` on `.sheet`, because the h1 reserves room on its
   * right for a disc that is no longer there.
   */
  hideClose?: boolean;
  /**
   * A close disc on the trailing edge instead of a back chevron on the leading
   * one — for a sheet that *dismisses* rather than goes back.
   *
   * The distinction is what the way out actually does. The project, answers and
   * insights sheets retrace a step: the answers sheet returns to the project it
   * was opened from, not to the page behind it, and a chevron is the symbol for
   * that. The New survey form and the sheet that hands over its link go nowhere
   * — there is only the page underneath, and closing is the end of the task
   * rather than a step back through it.
   *
   * **This reverses part of a decision from 17 August 2026**, which took a text
   * `Close` pill off the trailing edge because it sat in the same group as the
   * things you can *do* here. That reasoning holds and is why this is a disc set
   * apart from `.bartrail` rather than a pill inside it: it reads as furniture
   * belonging to the sheet, not as one of its actions.
   */
  dismiss?: boolean;
  /**
   * No toolbar at all — just a close disc laid over the content.
   *
   * For a sheet with one thing on it and nothing to put in a bar: no title to
   * clip, no actions to group, and nothing scrolling underneath that a blur ramp
   * has to soften. The bar was then 44px of furniture plus 118px of clearance
   * above the first word, all of it holding a close button.
   *
   * The disc is `position: absolute` against `.sheet`, so it stays put whether
   * or not the body ever scrolls.
   */
  bare?: boolean;
  /**
   * The sheet's toolbar actions, on the trailing edge before Close.
   *
   * Every action belonging to what the sheet is about lives here — Apple's HIG
   * puts the primary action and the More menu on the trailing edge, and having
   * one place to look beats hunting a long scrolling body for a button. The
   * way out is not among them; it has the leading edge to itself, which is the
   * HIG's own grouping: "Group navigation controls and critical actions like
   * Done, Close, or Save in dedicated, familiar, and visually distinct
   * sections."
   */
  actions?: ReactNode;
  /**
   * What the back control announces. A symbol carries no text, so this is the
   * only thing a screen reader has — and it names the destination, because
   * "Back" alone is what a sighted person can already see they are leaving.
   */
  backLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  /**
   * The sheet closes itself, then tells its caller — 20 August 2026.
   *
   * The CSS gives the sheet and the scrim a two-way transition with
   * `@starting-style` and `allow-discrete`, and it did nothing on the way out.
   * The reason is not CSS: every caller renders a sheet as
   * `{panel === 'x' && <Sheet…>}`, so pressing back unmounted the whole
   * `<dialog>` in the same tick. `allow-discrete` holds an element in the top
   * layer while its transition runs; it cannot hold one React has removed from
   * the document.
   *
   * So the way out is two steps. `close()` drops the `open` attribute — which
   * is what the transitions key off — and the node stays mounted while they
   * run. `onClose` fires afterwards and the caller unmounts a sheet that has
   * already gone.
   *
   * **Every path out routes through here**: the back chevron, the Escape key
   * and the light-dismiss all reach `close()`, and the dialog's own `close`
   * event is what schedules the caller. Nothing has to remember to call two
   * things in order.
   *
   * `leaving` guards a second press during the wait. Without it, two presses
   * schedule two `onClose` calls and the second lands after the sheet behind
   * this one has opened.
   */
  const leaving = useRef(false);
  const leave = useCallback(() => {
    const el = ref.current;
    if (!el || leaving.current) return;
    leaving.current = true;
    /* `close()` rather than calling back directly: it is what removes `open`,
       and `open` is what the transition is written against. */
    if (el.open) el.close();
    else onClose();
  }, [onClose]);

  /* The dialog has shut and the exit has run — now the caller may unmount. The
     delay is the panel duration; read from the element so it cannot drift from
     `--dur-panel`. */
  const settle = useCallback(() => {
    const el = ref.current;
    const ms = el
      ? parseFloat(getComputedStyle(el).getPropertyValue('--dur-panel') || '0.42') * 1000
      : 420;
    window.setTimeout(onClose, Number.isFinite(ms) && ms > 0 ? ms : 420);
  }, [onClose]);

  return (
    <dialog ref={ref} onClose={settle} onCancel={leave}>
      <div
        className={`sheet${narrow ? ' narrow' : ''}${bare ? ' bare' : ''}${
          hideClose ? ' noclose' : ''
        }${width ? ` ${width}` : ''}${surface ? ` ${surface}` : ''}`}
      >
        {bare && !hideClose && (
          <button className="sheetclose floating" onClick={leave} aria-label={backLabel}>
            <CloseMark />
          </button>
        )}
        {/* The scroller is inside the sheet, not the sheet itself. `.sheet`
            clips to its own 34px radius, so the scrollbar cannot run past the
            corners — see the note in globals.css. The bar is inside it too,
            which is what keeps content passing under a sticky header. */}
        <div className="sheetscroll">
          {!bare && (
            <div className={`sheet-top${dismiss ? ' dismissing' : ''}`}>
              {!dismiss && (
                <button className="back" onClick={leave} aria-label={backLabel}>
                  <BackMark />
                </button>
              )}
              <span className="t">{title}</span>
              <div className="bartrail">{actions}</div>
              {dismiss && (
                <button className="sheetclose" onClick={leave} aria-label={backLabel}>
                  <CloseMark />
                </button>
              )}
            </div>
          )}
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </dialog>
  );
}
