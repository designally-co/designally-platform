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
  onClose,
  children,
}: {
  title: ReactNode;
  narrow?: boolean;
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
          <button className="x" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
