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

/**
 * The bin, for deleting a response.
 *
 * The one mark in this app that names a destructive act, and it is the one
 * symbol a person has never had to learn. The lid is a separate stroke from the
 * body because at 20px a single outline reads as a cup.
 */
export function TrashMark() {
  return (
    <svg {...box}>
      <path d="M4.5 6.5 H19.5" {...stroke} />
      <path d="M9.5 6.5 V4.8 A1.3 1.3 0 0 1 10.8 3.5 h2.4 A1.3 1.3 0 0 1 14.5 4.8 V6.5" {...stroke} />
      <path d="M6.5 6.5 l0.8 12.2 A1.8 1.8 0 0 0 9.1 20.5 h5.8 a1.8 1.8 0 0 0 1.8-1.8 L17.5 6.5" {...stroke} />
      <path d="M10.4 10 v6.5" {...stroke} />
      <path d="M13.6 10 v6.5" {...stroke} />
    </svg>
  );
}

/* ── menu marks ──────────────────────────────────────────────────────
   iOS 27's `MenuItem` puts the symbol on the trailing edge in a 28px slot, and
   that is where these go — see `.barmenu button`. Same 24-unit grid and the
   same 1.9 stroke as the toolbar marks above, so a menu and the bar it hangs
   from are drawn at one weight. */

/** Markdown — a page with its text on it. The file is words, and says so. */
export function DocMark() {
  return (
    <svg {...box}>
      <path d="M6 3.5 h7.5 L18 8 v12.5 H6 Z" {...stroke} />
      <path d="M13.5 3.5 V8 H18" {...stroke} />
      <path d="M9 12.5 h6" {...stroke} />
      <path d="M9 16 h4" {...stroke} />
    </svg>
  );
}

/** PDF — a printer, because the action is a print and not a save. */
export function PrintMark() {
  return (
    <svg {...box}>
      <path d="M7.5 9.5 V3.5 h9 v6" {...stroke} />
      <path d="M7.5 17.5 H6 A2 2 0 0 1 4 15.5 v-4 A2 2 0 0 1 6 9.5 h12 a2 2 0 0 1 2 2 v4 a2 2 0 0 1-2 2 h-1.5" {...stroke} />
      <path d="M7.5 14 h9 v6.5 h-9 Z" {...stroke} />
    </svg>
  );
}

/**
 * Closing collection — a padlock, shut.
 *
 * Not a tick. A tick means done-and-correct, and closing collection is neither
 * of those: it is a decision to stop taking answers, which a person makes and
 * the app records. The lock says no more goes in, which is exactly what it does.
 */
export function LockMark() {
  return (
    <svg {...box}>
      <path d="M6.5 10.5 h11 a1.5 1.5 0 0 1 1.5 1.5 v7 a1.5 1.5 0 0 1-1.5 1.5 h-11 A1.5 1.5 0 0 1 5 19 v-7 a1.5 1.5 0 0 1 1.5-1.5 Z" {...stroke} />
      <path d="M8.5 10.5 V7.5 a3.5 3.5 0 0 1 7 0 v3" {...stroke} />
    </svg>
  );
}

/** Reopening — the turn back. */
export function UndoMark() {
  return (
    <svg {...box}>
      <path d="M4.5 7 v5 h5" {...stroke} />
      <path d="M5.6 12 a7 7 0 1 0 1.8-5.1 L4.5 9.4" {...stroke} />
    </svg>
  );
}

/** Archive — a box with its lid on, which is what filing something looks like. */
export function ArchiveMark() {
  return (
    <svg {...box}>
      <path d="M3.5 5 h17 v3.5 h-17 Z" {...stroke} />
      <path d="M5 8.5 v10.5 a1.5 1.5 0 0 0 1.5 1.5 h11 a1.5 1.5 0 0 0 1.5-1.5 V8.5" {...stroke} />
      <path d="M10 12.5 h4" {...stroke} />
    </svg>
  );
}
