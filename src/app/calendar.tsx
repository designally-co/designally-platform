'use client';

import { useState } from 'react';

import { NextMark, PrevMark } from './icons';

/**
 * A month you can point at — the grid on its own, with nothing around it.
 *
 * It was inside `date-field.tsx`, drawn into a `position: fixed` popup anchored
 * to three typeable boxes. That is still one of the two places it is wanted:
 * the New survey sheet needs a field, because a date being *entered* alongside
 * other fields is typed as often as it is pointed at.
 *
 * The other place has no field to hang off — 20 August 2026. The project
 * sheet's due date became a fact on the Collection bar rather than a control,
 * and the two acts that change it moved into the More menu, where what they
 * need is the grid itself sitting in the menu row that asked for it. Extracting
 * it is what keeps one calendar in the product: the alternative was a second
 * month grid built to live inline, drifting from this one on the first week
 * either was touched.
 *
 * It owns which month it is looking at and nothing else. The chosen day, the
 * earliest allowed day, and what happens on a press all come from above, so the
 * same grid serves *change this date* and *reopen until*, which differ in
 * exactly those three things.
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

/** Day 0 of the next month is the last day of this one, leap years included. */
export function daysIn(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Monday-first offset: JS puts Sunday at 0, and Sunday is the last column. */
export function leadingBlanks(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
}

/** Local, never UTC: `toISOString` is a day out for every Bangkok evening. */
export function dayString(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export default function Calendar({
  value,
  min,
  onPick,
  label,
}: {
  /** the chosen day, `yyyy-mm-dd`, or '' for none */
  value: string;
  /** the earliest day that can be chosen — earlier ones are shown and refused */
  min?: string;
  onPick: (value: string) => void;
  /** names the grid where it is not already inside something that says what it is */
  label?: string;
}) {
  /* Which month it opens on: the one the value is in, else this one. Held here
     rather than derived, because paging through months must not need a chosen
     day to page from. */
  const [view, setView] = useState(() => {
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
    const base = m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() + 1 };
  });

  const days = daysIn(view.y, view.m);
  const blanks = leadingBlanks(view.y, view.m);
  const today = dayString(new Date());

  const shift = (by: number) => {
    const d = new Date(view.y, view.m - 1 + by, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  return (
    <div className="dpcal" role="group" aria-label={label}>
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
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const iso = `${view.y}-${String(view.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          /* Shown and refused rather than hidden: a date already gone is a slip,
             not an intention, and the server says the same thing. A missing row
             would read as a broken calendar. */
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
              onClick={() => onPick(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
