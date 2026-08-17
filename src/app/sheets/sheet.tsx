'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A full-screen dialog on the parchment page, entering with an 18px rise. The
 * header is sticky and frosted. DESIGN.md §5.
 *
 * A native <dialog> gives the focus trap, the Escape key and inertness for
 * free — worth more than the markup it costs.
 */
export default function Sheet({
  title,
  narrow = false,
  actions,
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
   * one place to look beats hunting a long scrolling body for a button. Close
   * keeps its own group after them: "Group navigation controls and critical
   * actions like Done, Close, or Save in dedicated, familiar, and visually
   * distinct sections."
   */
  actions?: ReactNode;
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
        <div className="sheet-top">
          <span className="t">{title}</span>
          <div className="bartrail">{actions}</div>
          <button className="x" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
