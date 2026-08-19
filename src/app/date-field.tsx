'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAnchored, useDismiss } from './anchored';
import { CalendarMark, NextMark, PrevMark } from './icons';

/**
 * A date, as three boxes you can type in and a month you can point at.
 *
 * It replaces `<input type="date">`, which worked and was the one control on a
 * team sheet the design system could not reach: the browser draws its own
 * segment highlight, its own calendar glyph and its own popup, in its own
 * colours, inside our field. On a form where every other radius, ink and accent
 * had just been argued over, that left a hole shaped like a control.
 *
 * **The contract is unchanged — a `yyyy-mm-dd` string or `''`.** Same value the
 * native input gave, so `setDueDate`, `createSurvey` and `endOfDay` never learn
 * that anything happened. Empty means no date, which is how a survey sent before
 * the field existed already behaves.
 *
 * Order is day/month/year because everything else the team app prints is en-GB
 * — `13 Aug 2026, 13:23` on a response, `Sent 13 Aug` in the list — and a form
 * that reads mm/dd beside a list that reads dd/mm is how a date gets entered
 * wrong once a year and nobody can say when.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Monday first. Bangkok and en-GB both start the week there; the US does not. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Parts = { d: string; m: string; y: string };

const EMPTY: Parts = { d: '', m: '', y: '' };

/** Local, never UTC: `toISOString` is a day out for every Bangkok evening. */
function dayString(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function toParts(value: string): Parts {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return EMPTY;
  return { y: m[1], m: m[2], d: m[3] };
}

/**
 * Three complete boxes make a date; anything else makes nothing.
 *
 * Half-typed is not an error — somebody mid-way through the year is not wrong
 * yet — so it reports `''` and the field keeps showing what they typed.
 */
function toValue(p: Parts): string {
  if (p.d.length !== 2 || p.m.length !== 2 || p.y.length !== 4) return '';
  const y = Number(p.y);
  const mo = Number(p.m);
  const d = Number(p.d);
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return '';
  return `${p.y}-${p.m}-${p.d}`;
}

/** Day 0 of the next month is the last day of this one, leap years included. */
function daysIn(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Monday-first offset: JS puts Sunday at 0, and Sunday is the last column. */
function leadingBlanks(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

/**
 * What `position: fixed` is actually measured from here.
 *
 * Usually the viewport, and then this returns zero. But a `transform`, `filter`,
 * `backdrop-filter`, `perspective`, `contain: paint` or a `will-change` naming
 * any of them makes that ancestor the containing block for every fixed
 * descendant inside it — coordinates then count from its corner, and a calendar
 * placed at viewport coordinates lands offset by exactly its position.
 *
 * `.sheet` has such a transform for the 420ms of its entrance animation, so the
 * case is real rather than theoretical: open the calendar in that window and it
 * appears a sheet's width down and across. Walking for it is deterministic and
 * costs one pass up a shallow tree — the first version of this measured the
 * rendered result and corrected, which looped whenever the correction was
 * clamped by the viewport and never converged.
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

export default function DateField({
  labelledBy,
  value,
  min,
  onChange,
  disabled,
}: {
  /**
   * The id of the visible label. Not a `<label for>`: the thing being labelled
   * is a group of three spans, and `for` only binds to a form control — it
   * would have pointed at nothing and read as nothing.
   */
  labelledBy: string;
  /** `yyyy-mm-dd`, or '' for no date */
  value: string;
  /** the earliest day that can be chosen, `yyyy-mm-dd` — earlier days are shown and refused */
  min?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [parts, setParts] = useState<Parts>(() => toParts(value));
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  /* 316 x 330 is the calendar's own size to within a row; it only decides
     whether to open downward or up. See `useAnchored`. */
  const at = useAnchored(open, wrap, 316, 330);

  /* The value can change under us — cleared on the project sheet, or reset when
     a different project opens into the same component. Typing is the other
     direction and must not be clobbered, so this only runs when the incoming
     value is not the one the boxes already spell. */
  useEffect(() => {
    if (toValue(parts) !== value) setParts(toParts(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /**
   * Type freely; report only when there is something to report.
   *
   * A half-typed date is not a cleared one. `onChange` fires on a complete,
   * legal date, or on a field with all three boxes empty — and on nothing in
   * between. Without that, typing `0` into an empty day box would send `''` to
   * the server, and on the project sheet that is `setDueDate(null)`: the date
   * the client was told, deleted on the first keystroke of changing it.
   *
   * The boxes still show whatever was typed. What is refused is telling anybody
   * else about it.
   */
  const commit = useCallback(
    (next: Parts) => {
      setParts(next);
      const value = toValue(next);
      const cleared = !next.d && !next.m && !next.y;
      if (value || cleared) onChange(value);
    },
    [onChange],
  );

  /** Which month the calendar is looking at — the chosen one, else this one. */
  const chosen = toParts(value);
  const [view, setView] = useState(() => {
    const base = chosen.y ? new Date(Number(chosen.y), Number(chosen.m) - 1, 1) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() + 1 };
  });

  /* Opening should land on the month the value is in, not wherever the calendar
     was left last time. */
  useEffect(() => {
    if (!open) return;
    const p = toParts(value);
    if (p.y) setView({ y: Number(p.y), m: Number(p.m) });
  }, [open, value]);

  useDismiss(open, wrap, useCallback(() => setOpen(false), []));

  /**
   * One segment: type digits, or hold an arrow key.
   *
   * Typing replaces rather than appends once a box is full, so a second pass at
   * the day does not silently become the year. Arrows step and wrap, which is
   * what a spinbutton does and what the native control did.
   */
  const segment = (key: keyof Parts, size: number, hint: string, label: string) => {
    const text = parts[key];
    const max = key === 'y' ? 9999 : key === 'm' ? 12 : daysIn(Number(parts.y) || 2000, Number(parts.m) || 1);
    const lo = key === 'y' ? 1 : 1;

    const step = (by: number) => {
      const now = Number(text) || (by > 0 ? lo - 1 : max + 1);
      let next = now + by;
      if (next > max) next = lo;
      if (next < lo) next = max;
      commit({ ...parts, [key]: String(next).padStart(size, '0') });
    };

    return (
      <span
        key={key}
        role="spinbutton"
        aria-label={label}
        aria-valuenow={Number(text) || undefined}
        aria-valuetext={text || hint}
        tabIndex={disabled ? undefined : 0}
        className="dpseg"
        data-empty={text ? undefined : 'true'}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            commit({ ...parts, [key]: '' });
          } else if (/^\d$/.test(e.key)) {
            e.preventDefault();
            const grown = text.length >= size ? e.key : text + e.key;
            const next = { ...parts, [key]: grown };
            commit(next);
            /* Full box, so the cursor belongs in the next one — the native
               control did this and typing a date without it means reaching for
               Tab three times. */
            if (grown.length === size) {
              const order: (keyof Parts)[] = ['d', 'm', 'y'];
              const after = order[order.indexOf(key) + 1];
              if (after) {
                const el = wrap.current?.querySelector<HTMLElement>(`[data-seg="${after}"]`);
                el?.focus();
              }
            }
          }
        }}
        onBlur={() => {
          /* Pad on the way out: "1" typed in the day box is the 1st, and
             leaving it as "1" would make the value invalid rather than early. */
          if (text && text.length < size) {
            commit({ ...parts, [key]: text.padStart(size, '0') });
          }
        }}
        data-seg={key}
      >
        {text || hint}
      </span>
    );
  };

  const daysThisView = daysIn(view.y, view.m);
  const blanks = leadingBlanks(view.y, view.m);
  const today = dayString(new Date());

  const shift = (by: number) => {
    const d = new Date(view.y, view.m - 1 + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  return (
    <div className="dpwrap" ref={wrap}>
      <div
        className="dpfield"
        role="group"
        aria-labelledby={labelledBy}
        aria-disabled={disabled || undefined}
        data-open={open || undefined}
      >
        <span className="dpsegs">
          {segment('d', 2, 'dd', 'day')}
          <span className="dpsep">/</span>
          {segment('m', 2, 'mm', 'month')}
          <span className="dpsep">/</span>
          {segment('y', 4, 'yyyy', 'year')}
        </span>

        {/* There was a `×` here that emptied all three boxes. Clearing was a
            real answer while no date meant no date — the client saw none and
            nothing ever fired — and it stopped being one on 19 August 2026,
            when the date became what closes the link. A survey with no date
            takes answers until somebody remembers to close it, so both callers
            now require one and the control that offered the opposite is gone.

            Backspace still empties a box, because typing has to pass through
            empty on the way to a new number. What that produces is a field
            reporting `''` and a Save the caller has disabled — not a date
            quietly removed. */}
        <button
          type="button"
          className="dpopen"
          aria-label="Choose from a calendar"
          title="Choose from a calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          <CalendarMark />
        </button>
      </div>

      {open && at && (
        <div
          className="dppop"
          role="dialog"
          aria-label={`${MONTHS[view.m - 1]} ${view.y}`}
          style={{ top: at.top, left: at.left, width: at.width }}
        >
          <div className="dphead">
            <button type="button" className="dpnav" aria-label="Previous month" onClick={() => shift(-1)}>
              <PrevMark />
            </button>
            <span className="dpmonth" aria-live="polite">
              {MONTHS[view.m - 1]} {view.y}
            </span>
            <button type="button" className="dpnav" aria-label="Next month" onClick={() => shift(1)}>
              <NextMark />
            </button>
          </div>

          <div className="dpdow" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="dpgrid" role="grid">
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`b${i}`} className="dpblank" />
            ))}
            {Array.from({ length: daysThisView }, (_, i) => {
              const day = i + 1;
              const iso = `${view.y}-${String(view.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              /* Shown and refused rather than hidden: a date already gone is a
                 slip, not an intention, and `createSurvey` says the same thing
                 on the server. A missing row would read as a broken calendar. */
              const tooEarly = !!min && iso < min;
              return (
                <button
                  key={day}
                  type="button"
                  className="dpday"
                  disabled={tooEarly}
                  aria-current={iso === today ? 'date' : undefined}
                  aria-pressed={iso === value}
                  data-today={iso === today || undefined}
                  onClick={() => {
                    commit(toParts(iso));
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
