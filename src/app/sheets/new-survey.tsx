'use client';

import { useState, useTransition } from 'react';

import type { Package } from '@/lib/db/schema';
import { countQuestions, type LibraryBlock } from '@/lib/team/library-types';
import { PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { createSurvey, type NewSurveyField } from '@/lib/team/actions';
import { DEFAULT_DUE_DAYS, dayIn, defaultDueDay } from '@/lib/team/due';
import DateField from '../date-field';
import LinkAndCode from './link-code';
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
  /* Today in Bangkok, worked out in the browser for the same reason the prefill
     is: a constant baked at build time goes stale overnight. */
  const [today] = useState(() => dayIn(new Date()));
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
  const [pending, start] = useTransition();

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
            this date and enforces nothing.

            A span, not a <label for>: what it names is a group of three boxes,
            and `for` binds only to a form control. See date-field.tsx. */}
        <span className="f" id="nDue">
          Answers by
        </span>
        <DateField
          labelledBy="nDue"
          value={due}
          /* The server refuses a date already gone — a past due date would put
             the project into Needs you the moment the link was copied — so the
             calendar refuses it first, on the same boundary. */
          min={today}
          onChange={(v) => {
            setDue(v);
            if (error?.field === 'due') setError(null);
          }}
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

      {link && token ? (
        <div className="field">
          {/* a caption, not a label — it names no control */}
          <p className="f">Send this link to the client&apos;s main contact</p>
          {/**
           * The same control the project's Share panel uses, because it is the
           * same job — see link-code.tsx. It had grown its own: a text button
           * reading *Copy* that reported nothing when pressed, a smaller code,
           * and a caption where the Save was.
           */}
          <LinkAndCode token={token} url={full} />
          <p className="hintline">
            Opens without a login. Anyone the client forwards it to can answer.
          </p>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={submit} disabled={pending}>
          {pending ? 'Creating…' : 'Create'}
        </button>
      )}
    </Sheet>
  );
}
