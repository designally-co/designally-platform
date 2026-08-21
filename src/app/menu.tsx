'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { MoreMark } from './icons';
import { useAnchored } from './anchored';

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
  badge,
  menuClass,
  anchoredWidth,
  onClose,
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
  /**
   * A count riding the mark. Zero and undefined both draw nothing.
   *
   * The one place this app puts a number on a glyph, and it earns it: the
   * notification bell has to say *how many* without being opened, because
   * otherwise the page has no way at all to report outstanding work — the
   * section that used to do that is gone. `aria-hidden`, because `label`
   * already states the count in words and a badge read twice is a stutter.
   */
  badge?: number;
  /**
   * A class on the panel itself.
   *
   * One caller needs it: the notification bell, whose rows carry a whole
   * sentence rather than a two-word label, and the panel's default rule is
   * `white-space: nowrap` — sized by the widest item, which is correct for
   * `Download as Markdown` and would put a 60-character sentence across the
   * window. See `.barmenu.notes`.
   */
  menuClass?: string;
  /**
   * Hang the panel off the button with `position: fixed`, placed in JS.
   *
   * **The default is `absolute`, and it is clipped by anything that hides its
   * overflow.** A sheet does: `.sheet` has `overflow: hidden` so its corners
   * stay round, and the panel is inside its toolbar. Four short rows fit under
   * any sheet worth opening, which is why this went unnoticed — until the
   * calendar moved in. A month is 373px tall, a project with no answers makes a
   * 331px sheet, and 118px of it was cut off: the last row of days and both
   * buttons, on a panel whose whole job is to be pressed.
   *
   * `useAnchored` is what `.dppop`, `.splitmenu` and the share panel already
   * use for the same reason — the share panel hangs 500px off this very
   * toolbar. It walks for a transformed ancestor before measuring, which the
   * sheet has for the 420ms of its entrance, and re-places on scroll and
   * resize.
   *
   * The width has to be passed rather than measured: right-aligned placement is
   * `anchor.right - width`, so a panel that turns out wider than the number
   * given lands that far off its button.
   */
  anchoredWidth?: number;
  /**
   * The menu has shut — by the button, by Escape, or by a click away.
   *
   * A caller holding state *inside* the menu needs this, and the project sheet
   * does: which confirmation is expanded lives on the sheet, not here, so
   * closing the menu left Archive or Delete still open behind it and the next
   * press reopened onto an expanded destructive panel nobody had asked for
   * twice.
   *
   * Fires only on a real close, never on mount.
   */
  onClose?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  /**
   * The panel is still on screen and already on its way out.
   *
   * It unmounted in the same tick it was dismissed, so it grew on open and
   * disappeared between frames on close — the same asymmetry the sheets had,
   * on a smaller object. The panel is held for one feedback duration while the
   * exit runs, and only then does the caller hear about it.
   */
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /* Measured once it exists, so a panel that grows — a row unfolding into a
     confirmation, or into a month — is re-placed at its real height rather
     than the estimate below. */
  const panel = useRef<HTMLDivElement>(null);
  const at = useAnchored(
    open && !!anchoredWidth,
    ref,
    anchoredWidth ?? 240,
    /* an estimate, replaced by the measurement the moment the panel mounts;
       only used to decide whether there is room to open downward */
    380,
    /* it hangs off a disc on a toolbar's trailing edge, so it opens back into
       the sheet rather than off the side of it — the share panel's reasoning */
    'right',
    panel,
  );

  /* One way out, so the three that exist — the button, Escape, a click away —
     cannot each remember to tell the caller and one of them forget. Now it is
     also the one place the exit is timed, which is why a second press during
     the wait has to be ignored rather than starting a second one. */
  const shut = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setOpen(false);
      onClose?.();
    }, 180);
  }, [open, closing, onClose]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) shut();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* the sheet is a native <dialog>, which closes on Escape too — stop it
           here so the first press dismisses the menu and not the whole sheet */
        e.stopPropagation();
        shut();
      }
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open, shut]);

  return (
    <div className="moreslot" ref={ref}>
      <button
        className={danger ? 'iconbtn danger' : 'iconbtn'}
        aria-label={label}
        title={label}
        /* False the instant it is dismissed, not when it finishes leaving. The
           180ms the exit takes is an animation, and a screen reader should not
           be told the panel is still expanded through it. */
        aria-expanded={open && !closing}
        aria-haspopup="true"
        onClick={() => (open ? shut() : setOpen(true))}
      >
        {icon ?? <MoreMark />}
        {!!badge && (
          <span className="iconbadge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>
      {open && (!anchoredWidth || at) && (
        <div
          ref={panel}
          className={[
            'barmenu',
            anchoredWidth && 'floating',
            menuClass,
            closing && 'closing',
          ]
            .filter(Boolean)
            .join(' ')}
          style={at && anchoredWidth ? { top: at.top, left: at.left, width: at.width } : undefined}
        >
          {children(shut)}
        </div>
      )}
    </div>
  );
}
