'use client';

import { useEffect, useRef, useState } from 'react';

import { forDisplay } from '@/lib/survey/link';
import { surveyQr } from '@/lib/team/actions';
import { CheckMark, LinkMark, SaveMark, ShareMark } from '../icons';

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
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  /* Drawn once per open, and kept: the link cannot change while the panel is
     up, so a second open of the same project redraws nothing. */
  useEffect(() => {
    if (!open || qr) return;
    let live = true;
    surveyQr(token).then((r) => {
      if (!live) return;
      if ('svg' in r) setQr(r.svg);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [open, qr, token]);

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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The URL is on screen in a box, so the recovery is to select it — which
         is what the box is for and why it is not a read-only input the browser
         might style as unavailable. */
      setError('Could not reach the clipboard. The link is above — select and copy it.');
    }
  };

  /**
   * The code as a file.
   *
   * A blob and an object URL rather than a data: URI, because a QR SVG is a few
   * kilobytes of path and a data URI that long is a filename the browser
   * sometimes declines to honour. Revoked on the next frame; kept alive it
   * holds the blob for the life of the document.
   */
  const save = () => {
    if (!qr) return;
    const blob = new Blob([qr], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${token}-survey-qr.svg`;
    a.click();
    requestAnimationFrame(() => URL.revokeObjectURL(href));
  };

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

      {open && (
        <div className="sharepanel" role="dialog" aria-label="Share the survey link">
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

          {/**
           * The link and its Copy, on one line.
           *
           * Copy is filled rather than outlined: it is the action this panel is
           * opened for, and the accent is what the system uses to say so. A
           * white disc beside a grey box read as two pieces of furniture, with
           * nothing marking which one does something.
           *
           * A disc rather than a labelled button, because the row is the link —
           * a full-width `Copy link` under it pushed the code down a line and
           * spent the panel's loudest element on a verb the mark already says.
           */}
          <div className="sharerow">
            <span className="sharelink" title={url}>
              {forDisplay(url)}
            </span>
            <button
              className="sharecopy"
              aria-label={copied ? 'Link copied' : 'Copy link'}
              title={copied ? 'Copied' : 'Copy link'}
              onClick={copy}
            >
              {copied ? <CheckMark /> : <LinkMark />}
            </button>
          </div>

          {/* a swapped glyph is silent to a screen reader */}
          <span className="visually-hidden" role="status">
            {copied ? 'Link copied' : ''}
          </span>

          <div className="shareqr">
            {qr ? (
              <>
                {/* The encoder's own SVG, inlined. It carries no colour of its
                    own, so `currentColor` on the wrapper paints it — which is
                    what keeps it correct if this sheet is ever on the dark
                    Field, and what stops a printed code coming out orange. */}
                <div className="qrframe" dangerouslySetInnerHTML={{ __html: qr }} />
                {/**
                 * Save is under the code, after two goes at putting it on one.
                 *
                 * On the code it was centred — the one place that is safe,
                 * since a QR's three corner squares are *finder* patterns a
                 * decoder needs before any error correction runs, and covering
                 * one breaks the symbol outright however much redundancy it
                 * carries. That part was right and is not why it came off.
                 *
                 * It came off because a QR is the one surface in this system
                 * with no mid-tones: pure black modules on pure white, at full
                 * contrast, everywhere. Nothing sits *on* that. A flat disc
                 * disappears into the black; a white one with a halo and a ring
                 * reads as a patch punched out of the code, which is exactly
                 * what it is. There is no third try — the surface has no
                 * tonal room, and two attempts is the evidence.
                 *
                 * Under it, it is a quiet action row and not a second CTA. Copy
                 * is what this panel is opened for and keeps the accent; this
                 * takes the shape of a menu row — mark leading, 13px, `--ink-3`
                 * — which is the form the system already uses for an action
                 * that is available rather than urged.
                 */}
                <button className="sharesave" onClick={save}>
                  <SaveMark />
                  <span>Save the code</span>
                </button>
              </>
            ) : error ? null : (
              <div className="qrframe loading" aria-hidden="true" />
            )}
          </div>

          {error && <p className="formerror">{error}</p>}
        </div>
      )}
    </div>
  );
}
