'use client';

import { useEffect, useRef, useState } from 'react';

import { useAnchored } from '../anchored';
import { ShareMark } from '../icons';
import LinkAndCode from './link-code';

/**
 * Everything to do with sending the link, in one place you open.
 *
 * It was two things in two places: a chain-link button on the toolbar that
 * copied on press, and a section further down the sheet headed "The link" with
 * the URL in a box you could only select with a mouse. Neither was wrong and
 * together they were incoherent — the button gave you the link without showing
 * it, the section showed it without giving it to you, and a team wanting to put
 * the link on a phone had neither.
 *
 * One share control now. Press it and the link is there to read, to copy, and
 * as a code to point a camera at.
 *
 * **The QR is the reason this is a panel rather than a better button.** How the
 * link actually reaches a client is often a person in a room holding a laptop
 * and a client holding a phone, and a twelve-character token read aloud is a
 * token typed wrong. It draws on open, from a server action, so the encoder
 * stays out of the bundle — see `surveyQr`.
 */
export default function ShareLink({ token, url, closed }: { token: string; url: string; closed: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /**
   * Fixed, not absolute — the sheet is `overflow: hidden` so it can clip to its
   * own 34px corners, and this panel is nearly 500px tall. On a project with
   * nobody answered yet the sheet is shorter than that, and the code was being
   * sliced off at the bottom edge.
   *
   * Right-aligned, because it hangs off a disc on the toolbar's trailing edge
   * and has to open back into the sheet.
   */
  const at = useAnchored(open, ref, 320, 500, 'right');

  /* The same dismissal `MoreMenu` uses, and the same reason for capturing
     Escape: this sits inside a native <dialog>, which closes on Escape too, and
     the first press should shut the panel rather than the whole sheet. */
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
    <div className="shareslot" ref={ref}>
      <button
        className="iconbtn"
        aria-label="Share the link"
        title="Share the link"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <ShareMark />
      </button>

      {open && at && (
        <div
          className="sharepanel"
          role="dialog"
          aria-label="Share the survey link"
          style={{ top: at.top, left: at.left, width: at.width }}
        >
          {/**
           * The status, set as a status rather than as a sentence about one.
           *
           * It was a line of grey prose that read like a footnote, on the one
           * thing in this panel that changes what the link *does*. The state is
           * a label now — the system's established form for one, uppercase and
           * tracked, the same treatment `.qsec` gives a section — with the
           * consequence under it, one line each. Both wrapped at first, and a
           * two-line consequence under a one-word label is the paragraph this
           * was meant to stop being: "anyone who should have a say" became
           * "anyone who should answer", and "anyone opening this link now" lost
           * the noun the label above it had already said.
           *
           * No coloured dot, and that is not an omission. DESIGN.md §2: "a
           * status is the word for it, never a star or a dot beside a name.
           * A bare glyph needs a legend; words don't." So the word carries it,
           * and the two lines take two inks — which the same section allows
           * across separate lines and forbids inside one.
           */}
          <p className="sharestate">
            <b>{closed ? 'Closed' : 'Open'}</b>
            {closed
              ? ' — anyone who opens it now is told so.'
              : ' — anyone with this link can answer.'}
          </p>

          <LinkAndCode token={token} url={url} />
        </div>
      )}
    </div>
  );
}
