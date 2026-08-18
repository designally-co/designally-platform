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
 * `height` is an estimate and only decides which side to open on; the panel is
 * not sized by it. Being a little wrong means opening downward when upward
 * would have been slightly better, which is not worth a measure-then-render
 * pass to get exactly right.
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
) {
  const [at, setAt] = useState<Anchored | null>(null);
  /* Read through a ref so `place` can stay stable across renders — as a
     dependency it is also what the listeners are added and removed with. */
  const size = useRef({ width, height });
  size.current = { width, height };

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const w = Math.min(size.current.width, window.innerWidth - 16);
    const below = window.innerHeight - box.bottom;
    const top =
      below < size.current.height && box.top > size.current.height
        ? box.top - size.current.height - 8
        : box.bottom + 8;
    /* Kept on screen: a control near an edge would otherwise hang a panel off
       it, and there is nothing to scroll it back into view. */
    const wanted = align === 'right' ? box.right - w : box.left;
    const left = Math.max(8, Math.min(wanted, window.innerWidth - w - 8));
    const origin = fixedOrigin(el);
    setAt({ top: top - origin.y, left: left - origin.x, width: w });
  }, [anchor, align]);

  useEffect(() => {
    if (!open) return;
    place();
    /* Capture, so the sheet's own scroller is heard and not only the window. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    /* And again when an animation ends above us: what `fixedOrigin` measured
       can stop being true, which is exactly what the sheet's entrance does when
       it drops its transform. */
    document.addEventListener('animationend', place, true);
    document.addEventListener('transitionend', place, true);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('animationend', place, true);
      document.removeEventListener('transitionend', place, true);
    };
  }, [open, place]);

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
