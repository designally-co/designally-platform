'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Where to put a panel that hangs off a control inside a sheet.
 *
 * Written for the date field's calendar and extracted the moment the insights
 * banner needed the same thing. Both are popovers opened from the *body* of a
 * sheet, and a sheet is a hostile place to hang one:
 *
 * - The body scrolls. An absolutely positioned panel still counts toward its
 *   scroller's scrollable area, so opening one grows a scrollbar on a sheet
 *   built to hug its content, and the sheet jumps as it appears.
 * - The sheet is `overflow: hidden`, because it clips itself to its own 34px
 *   corners. A panel reaching past the sheet's edge is cut off rather than
 *   shown.
 *
 * `position: fixed` answers both — out of the scroller's flow, and not clipped
 * by any ancestor's overflow. What it costs is that the coordinates have to be
 * worked out rather than declared, which is what this does.
 */

export type Anchored = { top: number; left: number; width: number };

/**
 * What `position: fixed` is actually measured from.
 *
 * Usually the viewport, and then this returns zero. It stops being zero the
 * moment an ancestor has a transform, a filter, `contain` or a `will-change`
 * naming one of them: each makes that ancestor the containing block for every
 * fixed descendant inside it, so coordinates count from its corner instead.
 *
 * `.sheet` has exactly such a transform for the 420ms of its entrance
 * animation, which makes this a real case rather than a defensive one — open a
 * panel in that window and it lands a sheet's width down and across.
 */
function fixedOrigin(from: HTMLElement) {
  let n = from.parentElement;
  while (n && n !== document.documentElement) {
    const c = getComputedStyle(n);
    if (
      c.transform !== 'none' ||
      c.filter !== 'none' ||
      c.perspective !== 'none' ||
      (c.backdropFilter && c.backdropFilter !== 'none') ||
      /paint|layout|strict|content/.test(c.contain) ||
      /transform|filter|perspective/.test(c.willChange)
    ) {
      const r = n.getBoundingClientRect();
      return { x: r.left, y: r.top };
    }
    n = n.parentElement;
  }
  return { x: 0, y: 0 };
}

/**
 * Viewport coordinates for a panel of roughly `width` x `height`, under
 * `anchor` — or above it when there is no room below.
 *
 * `height` is an estimate, used until the panel exists and can be measured.
 *
 * **It decides more than which side to open on, which is what went wrong.**
 * When there is no room below, the panel is placed at `anchor.top - height - 8`
 * — so an estimate that is larger than the panel puts it that much too high. A
 * 340px guess in front of a 250px picker opened it ninety pixels clear of the
 * chevron that produced it, with nothing in between: it read as a panel
 * belonging to something else on the sheet.
 *
 * So `panel` is optional and, once given, replaces the guess with the real
 * height on the frame after mount. The estimate still does the first placement,
 * because there is nothing to measure before the panel renders.
 */
export function useAnchored(
  open: boolean,
  anchor: React.RefObject<HTMLElement | null>,
  width: number,
  height: number,
  /**
   * Which edge the panel lines up with. `right` for anything hanging off a
   * toolbar's trailing edge — the share panel, the version list — so it opens
   * back into the sheet rather than off the side of it.
   */
  align: 'left' | 'right' = 'left',
  /** the panel itself, so its true height can replace `height` once it exists */
  panel?: React.RefObject<HTMLElement | null>,
) {
  const [at, setAt] = useState<Anchored | null>(null);
  /* Read through a ref so `place` can stay stable across renders — as a
     dependency it is also what the listeners are added and removed with. */
  const size = useRef({ width, height });
  size.current = { width, height };
  /* Read through a ref for the same reason `size` is: `place` has to stay
     stable, and it is what the scroll and resize listeners are keyed on. */
  const panelRef = useRef(panel);
  panelRef.current = panel;

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const w = Math.min(size.current.width, window.innerWidth - 16);
    const below = window.innerHeight - box.bottom;
    /* The panel's own height the moment there is one, and the estimate before
       that. Both the choice of side and the distance depend on it. */
    const h = panelRef.current?.current?.getBoundingClientRect().height || size.current.height;
    const top = below < h && box.top > h ? box.top - h - 8 : box.bottom + 8;
    /* Kept on screen: a control near an edge would otherwise hang a panel off
       it, and there is nothing to scroll it back into view. */
    const wanted = align === 'right' ? box.right - w : box.left;
    const left = Math.max(8, Math.min(wanted, window.innerWidth - w - 8));
    const origin = fixedOrigin(el);
    setAt({ top: top - origin.y, left: left - origin.x, width: w });
  }, [anchor, align]);

  /**
   * `width` and `height` are dependencies, and leaving them out was a bug —
   * 21 August 2026, reported as a calendar hanging off the side of a phone.
   *
   * `place` is memoised on the anchor and the side only, so a panel that
   * *changes size while it is open* was never re-placed. The project sheet's
   * menu does exactly that: 240 wide as a list of rows, 316 once a row unfolds
   * into a month. Right-aligned placement is `anchor.right - width`, so the
   * panel went on sitting at the 240 offset while rendering 316 wide, and hung
   * 76px off the right of the screen with Sunday and Cancel past the edge.
   *
   * It looked fine on a desktop because it did not stay wrong: any hover
   * transition anywhere in the document fires the `transitionend` listener
   * below, which re-places it with the width it has now. That is the sideways
   * jump the panel had on opening a calendar, reported in the same breath. A
   * touch device has no hover, so there was nothing to correct it.
   */
  useEffect(() => {
    if (!open) return;
    place();
    /* Again on the next frame, when the panel exists and can be measured. The
       first call uses the estimate because there is nothing else to use. */
    const measured = requestAnimationFrame(place);
    /* Capture, so the sheet's own scroller is heard and not only the window. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    /* And again when an animation ends above us: what `fixedOrigin` measured
       can stop being true, which is exactly what the sheet's entrance does when
       it drops its transform. */
    document.addEventListener('animationend', place, true);
    document.addEventListener('transitionend', place, true);
    return () => {
      cancelAnimationFrame(measured);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('animationend', place, true);
      document.removeEventListener('transitionend', place, true);
    };
  }, [open, place, width, height]);

  return at;
}

/**
 * Shut on a click outside, or on Escape.
 *
 * Escape is captured because these live inside a native `<dialog>`, which
 * closes on Escape too — the first press should shut the panel rather than the
 * whole sheet.
 */
export function useDismiss(open: boolean, wrap: React.RefObject<HTMLElement | null>, shut: () => void) {
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) shut();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [open, wrap, shut]);
}
