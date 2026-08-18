'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MoreMark } from './icons';

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
 *
 * The button is the ellipsis, bare — the one symbol the HIG's own More menus
 * use, and the only mark in this app that needs no argument for it. `label` is
 * what it announces and what the tooltip says; the items inside stay in words,
 * because a menu is a list of sentences and there is room for them.
 */
export default function MoreMenu({
  label = 'More',
  icon,
  danger = false,
  children,
}: {
  label?: string;
  /**
   * The mark on the button. Defaults to the ellipsis, which is what More means.
   *
   * Given one, this is not a More menu any more but the same machinery — a
   * popover that dismisses on Escape and on a click away, and stops Escape
   * reaching the `<dialog>` it sits inside. A download that has two formats and
   * a delete that has to be confirmed both need exactly that and nothing else.
   */
  icon?: ReactNode;
  /** the control is destructive, and the mark says so before it is pressed */
  danger?: boolean;
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
        className={danger ? 'iconbtn danger' : 'iconbtn'}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {icon ?? <MoreMark />}
      </button>
      {open && <div className="barmenu">{children(() => setOpen(false))}</div>}
    </div>
  );
}
