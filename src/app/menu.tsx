'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The More menu, on the trailing edge of a toolbar.
 *
 * Apple's HIG: "Add a More menu to contain additional actions. Prioritize less
 * important actions for inclusion in the More menu. Try to include all actions
 * in the toolbar if possible, and only add this menu if you really need it."
 *
 * One component for both toolbars — the page's and the sheets' — because the
 * HIG's own reason is consistency: "Keep consistent groupings and placement
 * across platforms. This helps people develop familiarity with your app and
 * trust that it behaves similarly regardless of where they use it." Two menus
 * built twice drift, and this one has enough behaviour to be worth writing
 * once: Escape, outside-click, and `aria-expanded` tracking the panel.
 *
 * Children are a function of `close` so an item can dismiss the menu after
 * acting — or deliberately not, which is what the archive confirmation does.
 */
export default function MoreMenu({
  label = 'More',
  children,
}: {
  label?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* the sheet is a native <dialog>, which closes on Escape too — stop it
           here so the first press dismisses the menu and not the whole sheet */
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  return (
    <div className="moreslot" ref={ref}>
      <button
        className="linkish"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && <div className="barmenu">{children(() => setOpen(false))}</div>}
    </div>
  );
}
