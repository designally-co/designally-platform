'use client';

import { useEffect, useState, useTransition } from 'react';

import type { Package } from '@/lib/db/schema';
import { countQuestions, type LibraryBlock } from '@/lib/team/library-types';
import { PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { createSurvey, surveyQr, type NewSurveyField } from '@/lib/team/actions';
import { DEFAULT_DUE_DAYS, defaultDueDay } from '@/lib/team/due';
import { forDisplay } from '@/lib/survey/link';
import Sheet from './sheet';

const OPTIONS: { key: Package; label: string }[] = [
  { key: 'brand', label: 'Brand Strategy + Identity' },
  { key: 'design', label: 'Design' },
];

export default function NewSurveySheet({
  library,
  origin,
  onClose,
  onCreated,
}: {
  library: LibraryBlock[];
  origin: string;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [client, setClient] = useState('');
  /**
   * Two weeks, and changeable before the link is made rather than only after.
   * It used to be set silently at creation and edited on the project — by which
   * point the link had usually been copied and sent, so the date the client
   * saw was the default whatever the team had actually agreed.
   *
   * Computed once, on the client, so the prefill is today in Bangkok and not
   * whenever this bundle was built.
   */
  const [due, setDue] = useState(() => defaultDueDay());
  /**
   * The one thing that went wrong, and which control it is about.
   *
   * One at a time, because the server checks in order and stops — reporting a
   * date problem the user has not reached yet would be noise about a field they
   * have not touched.
   */
  const [error, setError] = useState<{ text: string; field?: NewSurveyField } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  /**
   * The code, drawn once the survey exists.
   *
   * Fetched rather than bundled: the encoder is a server action so it stays out
   * of a bundle that is loaded to *create* a survey, and most of the time nobody
   * gets as far as a code. Failing is silent — the link above it is the thing
   * this sheet promised, and a red line under a working URL saying the picture
   * did not draw would be alarming about nothing.
   */
  useEffect(() => {
    if (!token) return;
    let live = true;
    surveyQr(token).then((r) => {
      if (live && 'svg' in r) setQr(r.svg);
    });
    return () => {
      live = false;
    };
  }, [token]);

  const submit = () => {
    setError(null);
    const form = new FormData();
    form.set('client', client);
    form.set('package', pkg ?? '');
    form.set('due', due);
    start(async () => {
      const result = await createSurvey(form);
      if (!result.ok) {
        setError({ text: result.error, field: result.field });
        return;
      }
      setLink(result.link);
      setToken(result.token);
      onCreated(`${OPTIONS.find((o) => o.key === pkg)?.label} questionnaire attached.`);
    });
  };

  /* The message for one field, or nothing. Clearing on edit is deliberate: an
     error that survives the fix it asked for teaches people to ignore it. */
  const errFor = (field: NewSurveyField) =>
    error?.field === field ? <p className="fielderror">{error.text}</p> : null;

  // the copyable link must be the one that actually resolves
  const full = link ? `${origin}${link}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet title="New survey" narrow onClose={onClose}>
      <div className="field">
        <label className="f" htmlFor="nClient">
          Project
        </label>
        <input
          id="nClient"
          type="text"
          className="input"
          value={client}
          onChange={(e) => {
            setClient(e.target.value);
            if (error?.field === 'client') setError(null);
          }}
          placeholder="ACME Coffee"
          aria-invalid={error?.field === 'client' || undefined}
          disabled={Boolean(link)}
        />
        {errFor('client')}
      </div>

      <div className="field">
        {/* A <label> with no `for` and no control inside labels nothing — a
            screen reader heard "Brand, pressed" with no idea what was being
            chosen, on the screen that decides which questionnaire a client
            gets. It is a group with a name now. */}
        <span className="f" id="pkg-label">
          Package
        </span>
        <div className="opts" role="group" aria-labelledby="pkg-label">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className="opt"
              aria-pressed={pkg === o.key}
              onClick={() => {
                setPkg(o.key);
                if (error?.field === 'package') setError(null);
              }}
              disabled={Boolean(link)}
            >
              {o.label}
              <small>{countQuestions(library, PACKAGE_BLOCKS[o.key])} questions</small>
            </button>
          ))}
        </div>
        {errFor('package')}
      </div>

      <div className="field">
        {/* "Asking for answers by" beside "Client" and "Package" — one label
            arguing its own case next to two nouns. "Answers by" fits the pair
            and keeps rule 1 intact, which "Deadline" would not: the app asks for
            this date and enforces nothing. */}
        <label className="f" htmlFor="nDue">
          Answers by
        </label>
        <input
          id="nDue"
          type="date"
          className="input"
          value={due}
          onChange={(e) => {
            setDue(e.target.value);
            if (error?.field === 'due') setError(null);
          }}
          aria-invalid={error?.field === 'due' || undefined}
          disabled={Boolean(link)}
        />
        {errFor('due')}
        {/**
         * What the box is already filled with, and nothing else.
         *
         * This field carried three sentences, with a four-line note under it
         * about nobody needing to know who will answer — two paragraphs of
         * standing policy on a form with three fields, read once and scrolled
         * past ever after. Rule 1 and rule 3 have not changed; a form is simply
         * not where a product explains itself, and both are said properly on the
         * project this creates.
         *
         * Every label on this sheet is a bare noun now. The qualifiers each
         * label carried — "· this chooses the questionnaire", "· 14 days,
         * change it if you need to" — were doing two jobs from one line, and a
         * label that argues with you is a label you stop reading. What survives
         * is the one fact this control cannot show by itself: the date in the
         * box was chosen for you.
         */}
        <p className="hintline">{DEFAULT_DUE_DAYS} days by default</p>
      </div>

      {/* Anything with no field of its own — a dead database, an expired
          session. Rare, and it has nowhere better to go. */}
      {error && !error.field && <p className="formerror">{error.text}</p>}

      {link ? (
        <div className="field">
          {/* a caption, not a label — it names no control */}
          <p className="f">Send this link to the client&apos;s main contact</p>
          <div className="linkbox">
            <span>{forDisplay(full)}</span>
            <button className="btn btn-quiet" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="hintline">
            Opens without a login. Anyone the client forwards it to can answer.
          </p>

          {/**
           * The same link, for a camera.
           *
           * How this reaches a client is often a person in a room holding a
           * laptop and a client holding a phone, and a twelve-character token
           * read aloud is a token typed wrong. The share panel on the project
           * has carried a code for that reason since it was built; this sheet
           * is where the link is newest and most likely to be handed over on
           * the spot, and it was the one place you could not.
           */}
          <div className="newqr">
            {qr ? (
              /* the encoder's SVG carries no colour of its own, so
                 `currentColor` on the frame paints it */
              <div className="qrframe" dangerouslySetInnerHTML={{ __html: qr }} />
            ) : (
              <div className="qrframe loading" aria-hidden="true" />
            )}
            <p className="hintline">Or let them point a camera at this.</p>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={submit} disabled={pending}>
          {pending ? 'Creating…' : 'Create'}
        </button>
      )}
    </Sheet>
  );
}
