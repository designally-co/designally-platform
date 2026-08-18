/**
 * The team app's toolbar marks.
 *
 * Apple's HIG: "Make sure the meaning of each control is clear. Don't make
 * people guess or experiment to figure out what a toolbar item does. Prefer
 * simple, recognizable symbols for items instead of text, except for actions
 * like edit that aren't well-represented by symbols." And: "Prefer
 * system-provided symbols without borders. Borders (like outlined circle
 * symbols) aren't necessary because the section provides a visible container."
 *
 * So these are drawn bare, not in a disc. The one disc in a sheet header is the
 * back control, and that difference is doing work — it is the HIG's own
 * grouping, navigation set apart from actions: "Group navigation controls and
 * critical actions like Done, Close, or Save in dedicated, familiar, and
 * visually distinct sections." Three identical discs in a row would have read
 * as a segmented control instead.
 *
 * Kept apart from `chevron.tsx`, which the client survey imports: the survey
 * has one mark and no toolbar, and nothing here should follow it into that
 * bundle.
 *
 * Every one is `currentColor` at `strokeWidth 1.9`, drawn on the same 24-unit
 * grid as the chevron so they sit at one weight beside it.
 */

const box = {
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  fill: 'none',
  'aria-hidden': true,
} as const;

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * A chain link, for Copy link.
 *
 * The mark names the *thing* rather than the verb, which is the more
 * recognisable half: two interlocking pages could be copying anything, and what
 * this button puts on the clipboard is the survey link. The verb is in the
 * tooltip and the accessible name.
 */
export function LinkMark() {
  return (
    <svg {...box}>
      <path d="M10.2 13.8a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.3 1.3" {...stroke} />
      <path d="M13.8 10.2a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.3-1.3" {...stroke} />
    </svg>
  );
}

/** The confirmation Copy link turns into for two seconds. */
export function CheckMark() {
  return (
    <svg {...box}>
      <path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" {...stroke} />
    </svg>
  );
}

/**
 * The ellipsis, for More. The one symbol the HIG's own More menus use, and the
 * only mark here that needs no argument for it.
 */
export function MoreMark() {
  return (
    <svg {...box}>
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * The share glyph — a box with an arrow leaving the top of it.
 *
 * The platform's own, not the platform's *look*: this is Apple's arrangement
 * because it is the one a designer on a Mac has pressed ten thousand times, and
 * a mark whose meaning has to be learned is a mark that does not work on a
 * toolbar with no labels. The verb is in the tooltip and the accessible name,
 * the way `LinkMark`'s is.
 *
 * It replaces the chain link on the project sheet, which copied on press. A
 * chain link promises the clipboard and nothing else; this opens the panel that
 * holds the link, the copy, and the code a client can point a camera at.
 */
export function ShareMark() {
  return (
    <svg {...box}>
      <path d="M12 3.5 L12 14.5" {...stroke} />
      <path d="M8.2 7.3 L12 3.5 L15.8 7.3" {...stroke} />
      <path d="M7 10.5 H5.5 A1.5 1.5 0 0 0 4 12 v7 A1.5 1.5 0 0 0 5.5 20.5 h13 A1.5 1.5 0 0 0 20 19 v-7 a1.5 1.5 0 0 0-1.5-1.5 H17" {...stroke} />
    </svg>
  );
}

/** Saving the QR — an arrow into a tray, the share mark's opposite. */
export function SaveMark() {
  return (
    <svg {...box}>
      <path d="M12 3.5 L12 14.5" {...stroke} />
      <path d="M8.2 10.7 L12 14.5 L15.8 10.7" {...stroke} />
      <path d="M4.5 17.5 v1.5 A1.5 1.5 0 0 0 6 20.5 h12 a1.5 1.5 0 0 0 1.5-1.5 v-1.5" {...stroke} />
    </svg>
  );
}
