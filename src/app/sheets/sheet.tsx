'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { BackMark } from '../icons';

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
  actions,
  backLabel = 'Back',
  onClose,
  children,
}: {
  title: ReactNode;
  narrow?: boolean;
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

  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose}>
      <div className={`sheet${narrow ? ' narrow' : ''}`}>
        {/* The scroller is inside the sheet, not the sheet itself. `.sheet`
            clips to its own 34px radius, so the scrollbar cannot run past the
            corners — see the note in globals.css. The bar is inside it too,
            which is what keeps content passing under a sticky header. */}
        <div className="sheetscroll">
          <div className="sheet-top">
            <button className="back" onClick={onClose} aria-label={backLabel}>
              <BackMark />
            </button>
            <span className="t">{title}</span>
            <div className="bartrail">{actions}</div>
          </div>
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </dialog>
  );
}
