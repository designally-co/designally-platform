/**
 * The team app's marks — Lucide, named for what they do here.
 *
 * They were eleven hand-drawn SVGs. Lucide is the library they were already
 * imitating: the same 24-unit grid, `currentColor`, round caps and joins, and a
 * stroke within a tenth of the one they used. Adopted 18 August 2026 so the set
 * is consistent by construction rather than by eleven separate hands, and so
 * the twelfth mark is an import rather than an evening.
 *
 * **They keep this product's names, not Lucide's.** `LockMark` rather than
 * `Lock` at the call site, because the name is where the decision lives — the
 * padlock was chosen over a tick for *close collection* on the reasoning that a
 * tick means done-and-correct and closing collection is neither, it is a person
 * deciding to stop taking answers. Import `Lock` directly at a call site and
 * that argument is invisible; the mapping below is where it stays legible, and
 * it is the one place to change if a mark is ever wrong.
 *
 * A single wrapper sets size and weight, so nothing downstream can drift: 20px
 * on a 24 grid at `strokeWidth 1.9`. Every mark in the team app goes through it,
 * which is what makes a toolbar disc and a menu row one family — and what
 * caught the back chevron, the one control that was not going through it and
 * was 24px at 2.5 beside them. `aria-hidden` on all of them: each sits inside a
 * control whose accessible name is text.
 *
 * **`chevron.tsx` stays hand-drawn, and that is deliberate.** It is the
 * survey's only mark, and the survey is answered on a phone, in Thailand, on a
 * connection this project's brief names as the constraint. Ten lines of inline
 * SVG cost nothing; a dependency in that bundle for one chevron is a cost paid
 * by every client, on the surface where it is least affordable. Tree-shaking
 * would probably spare them — "probably" is not a thing to find out on a client
 * survey, and the measurement is in the commit.
 */
import {
  Archive,
  Check,
  ChevronLeft,
  Download,
  FileText,
  Link as LinkIcon,
  Lock,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Share,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

/**
 * One size and one weight for every mark in the team app.
 *
 * 20px inside a 44px disc and beside a 14.5px menu label — the value the hand
 * drawn set used, kept so nothing shifted when the drawings changed. 1.9 rather
 * than Lucide's default 2, because 1.9 is what the hand-drawn set was, and a
 * tenth of a pixel across eleven marks is the difference between one family and
 * two.
 */
function mark(Icon: LucideIcon) {
  const Mark = () => <Icon size={20} strokeWidth={1.9} aria-hidden="true" />;
  Mark.displayName = `Mark(${Icon.displayName ?? 'icon'})`;
  return Mark;
}

/** Copy link — the thing on the clipboard is a link, so the mark names the thing. */
export const LinkMark = mark(LinkIcon);

/** What Copy turns into for two seconds. The only thing that says it worked. */
export const CheckMark = mark(Check);

/** More. The one symbol the HIG's own More menus use. */
export const MoreMark = mark(MoreHorizontal);

/** Share — Lucide's `Share` is the box-and-arrow arrangement a Mac user has
 *  pressed ten thousand times, which is why it needs no label. */
export const ShareMark = mark(Share);

/** Download, on the toolbar and beside the QR. */
export const SaveMark = mark(Download);

/** Delete. `Trash2` is the lidded bin — the plain `Trash` reads as a cup at 20px. */
export const TrashMark = mark(Trash2);

/** Archive — a filed box, which is what archiving is. */
export const ArchiveMark = mark(Archive);

/**
 * Closing collection.
 *
 * A padlock and not a tick. A tick means done-and-correct; closing collection is
 * neither, it is a decision to stop taking answers that a person makes and the
 * app records. The lock says nothing more goes in, which is exactly what it does.
 */
export const LockMark = mark(Lock);

/** Reopening — the turn back. */
export const UndoMark = mark(RotateCcw);

/** Markdown — a page with its words on it. The file is text, and says so. */
export const DocMark = mark(FileText);

/** PDF — a printer, because the action is a print and not a save. */
export const PrintMark = mark(Printer);

/**
 * Back — the one mark that does not take the wrapper's numbers.
 *
 * A chevron is two strokes and an apex; every other mark here is a closed form.
 * At the same nominal size they are not the same size at all, and `getBBox()`
 * says by how much — the drawn ink, in pixels, at `size={20}`:
 *
 *     ChevronLeft    5.0 x 10.0        Trash2, Lock  15.0 x 16.7
 *     Share         13.3 x 16.7        Printer, Link 16.7 x 16.7
 *     Download      15.0 x 15.0
 *
 * `ChevronLeft` occupies 6x12 of the 24 grid where the rest occupy 16–20 by
 * 18–20. Sized to match them it is a quarter of their area and reads as a
 * smaller icon, which is what it looked like — and going through the wrapper
 * was what made that exact, not what caused it.
 *
 * So it is sized by its ink instead. `size={32}` puts the chevron's height at
 * 16px, the median of the others; `strokeWidth={1.19}` is `1.9 x 20/24 x 24/32`,
 * which renders the same 1.58px stroke the wrapper produces at 20. Nominal box
 * bigger, drawn mark the same weight and height as its neighbours.
 *
 * The width stays narrow — 8px against their 13–17 — and that is correct. A
 * chevron is a tall thin mark and matching its *width* would make it a wedge.
 *
 * `chevron.tsx` keeps the survey, where the disc is 52px and DESIGN.md §5 scales
 * the glyph with the disc. It also keeps Lucide out of that bundle, which is why
 * it was not replaced outright.
 */
export function BackMark() {
  return <ChevronLeft size={32} strokeWidth={1.19} aria-hidden="true" />;
}
