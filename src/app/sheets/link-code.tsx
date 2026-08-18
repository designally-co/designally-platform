'use client';

import { useEffect, useState } from 'react';

import { forDisplay } from '@/lib/survey/link';
import { surveyQr } from '@/lib/team/actions';
import { CheckMark, LinkMark, SaveMark } from '../icons';

/**
 * A survey link: to read, to copy, and as a code to point a camera at.
 *
 * Two places hand a team this link — the share panel on a project, and the New
 * survey sheet the moment one is made — and they had grown two different
 * answers to the same job. The panel had a filled disc that turned into a tick,
 * a full-width code and a Save pill; the New survey sheet had a text button
 * reading *Copy* that reported nothing, a smaller code, and a caption where the
 * Save was. Same link, same week, same team, two controls.
 *
 * One component, so the next change lands in both. Everything about *how the
 * link is presented* is here; everything about *why you are looking at it* —
 * the panel's Open/Closed line, the sheet's "send this to the client's main
 * contact" — stays with the caller, because that is the part that genuinely
 * differs.
 *
 * **The QR is why this is worth a component rather than a shared stylesheet.**
 * It is fetched, not rendered: the encoder is a server action so it stays out
 * of a bundle loaded to *create* a survey, and the fetch, the loading square and
 * the blob-and-revoke of the download are three things neither caller should be
 * holding.
 */
export default function LinkAndCode({ token, url }: { token: string; url: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Drawn once: a token cannot change under a mounted component, so reopening
     the same project redraws nothing. */
  useEffect(() => {
    let live = true;
    surveyQr(token).then((r) => {
      if (!live) return;
      if ('svg' in r) setQr(r.svg);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The URL is on screen and selectable, which is the recovery — and the
         reason it is a span rather than a read-only input the browser might
         grey out. */
      setError('Could not reach the clipboard. The link is above — select and copy it.');
    }
  };

  /**
   * The code as a file.
   *
   * A blob and an object URL rather than a `data:` URI: a QR SVG is a few
   * kilobytes of path, and a data URI that long is a filename the browser
   * sometimes declines to honour. Revoked on the next frame — kept alive it
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
    /**
     * One column, one width.
     *
     * The link row used to take the width of whatever held it while the code
     * and its Save pill were capped at 288 — which is invisible in a 320px
     * panel, where everything is 288 anyway, and obvious on the sheet that
     * hands over a new link: a full-width row above a centred code. They are
     * three parts of one object and they line up.
     */
    <div className="linkcode">
      {/**
       * The link and its Copy, on one line.
       *
       * Copy is filled rather than outlined: it is the thing this is opened for,
       * and the accent is what the system uses to say so. A disc rather than a
       * labelled button, because the row *is* the link — a full-width `Copy
       * link` under it would push the code down a line and spend the loudest
       * element on a verb the mark already says.
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
            {/* The encoder's own SVG, inlined. It carries no colour of its own,
                so `currentColor` on the frame paints it — which keeps it right
                if this is ever on the dark Field, and stops a printed code
                coming out orange. */}
            <div className="qrframe" dangerouslySetInnerHTML={{ __html: qr }} />
            <button className="btn btn-outline sharesave" onClick={save}>
              <SaveMark />
              <span>Save QR code</span>
            </button>
          </>
        ) : error ? null : (
          /* Holds the square before the code arrives, so nothing below it jumps
             when the server answers. */
          <div className="qrframe loading" aria-hidden="true" />
        )}
      </div>

      {error && <p className="formerror">{error}</p>}
    </div>
  );
}
