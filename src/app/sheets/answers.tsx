'use client';

import { useState, useTransition } from 'react';

import { deleteResponse } from '@/lib/team/actions';
import type { AnswerValue } from '@/lib/db/schema';
import type { ProjectAnswers, ReadableAnswer } from '@/lib/team/answers';
import Sheet from './sheet';

/**
 * What the client actually said, in full.
 *
 * The engine stopped interpreting answers on 13 August 2026 — reading them is
 * the team's job. This is the surface that makes that true rather than merely
 * cheaper: before it, the app showed how many people had answered and nothing
 * about what they answered.
 *
 * **One respondent at a time, not one question at a time.** The team's question
 * is "what does this person think", and reading a single mind end to end is how
 * a contradiction inside one head becomes visible — which is the finding the
 * first real insights turned up. Comparing people across a question is what the
 * summary is for.
 *
 * **Blanks are shown, and counted.** A question nobody could answer is the
 * insight spec's most valuable signal; a view that listed only what was filled
 * in would hide it perfectly.
 */

/**
 * A scale answer, with the words the client was actually looking at.
 *
 * It read "4 of 5 · pair 1" through to "3 of 5 · pair 10" — ten numbers about
 * ten things the reader could not see. The answer stores only the pair's index,
 * so the labels have to be carried from the question; see `ReadableAnswer.pairs`.
 *
 * The poles are named in the order they were on screen, and the position is
 * stated against them: `1` was the left word and `points` was the right one, so
 * "2 of 5" between Serious and Fun means nearer Serious. Reading it any other
 * way is a mistake nothing on the old row could prevent.
 *
 * English only. The client chose their language, the team reads in one.
 *
 * A pair the question no longer has still renders — a survey answered at an
 * earlier version can carry an index this version dropped, and losing the
 * number would be worse than showing it bare.
 */
function Scale({
  value,
  pairs,
}: {
  value: Extract<AnswerValue, { kind: 'scale' }>;
  pairs?: ReadableAnswer['pairs'];
}) {
  const entries = Object.entries(value.values).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <ul className="ansscale">
      {entries.map(([index, point]) => {
        const pair = pairs?.[Number(index)];
        /* how far along, so the eye can rank ten rows without doing the
           arithmetic ten times. 1 sits at the left word, `points` at the right. */
        const along = value.points > 1 ? (point - 1) / (value.points - 1) : 0.5;
        return (
          <li key={index}>
            {pair ? (
              <span className="pair">
                <b>{pair.left_en}</b>
                <i style={{ '--at': along } as React.CSSProperties} aria-hidden="true" />
                <b>{pair.right_en}</b>
              </span>
            ) : (
              <span className="pair unlabelled">pair {Number(index) + 1}</span>
            )}
            <span className="pos">
              {point} <i>of {value.points}</i>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Value({ value, pairs }: { value: AnswerValue; pairs?: ReadableAnswer['pairs'] }) {
  switch (value.kind) {
    case 'text':
      /* the client's own words, wrapped as they wrote them — never trimmed to a
         preview, because the long answers are where the reasoning is */
      return <p className="anstext">{value.text}</p>;
    case 'choice':
      return (
        <p className="anschoice">
          <b>{value.choice}</b>
          {value.other && <span className="other">{value.other}</span>}
        </p>
      );
    case 'multi':
      return (
        <>
          <ul className="anschips">
            {value.choices.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          {value.other && <p className="other">{value.other}</p>}
        </>
      );
    case 'scale':
      return <Scale value={value} pairs={pairs} />;
  }
}

function Answer({ a }: { a: ReadableAnswer }) {
  return (
    <li className={a.value ? 'ansrow' : 'ansrow blank'}>
      <div className="ansq">
        <span className="num">{a.number ?? '·'}</span>
        <span className="qt">
          {a.textEn}
          {a.textTh && <i className="th">{a.textTh}</i>}
        </span>
      </div>
      {a.value ? <Value value={a.value} pairs={a.pairs} /> : <p className="noanswer">Left blank</p>}
    </li>
  );
}

export default function AnswersSheet({
  data,
  clientName,
  focus,
  backLabel,
  onDeleted,
  onClose,
}: {
  data: ProjectAnswers;
  clientName: string;
  /**
   * Whose answers to open on. The sheet is reached by clicking a person on the
   * project, so it opens on that person rather than on whoever answered first
   * and making the team find them again in the tabs.
   */
  focus?: string;
  /** where back goes — the project, when the sheet was opened from one */
  backLabel?: string;
  /** a response was deleted — the caller closes this sheet and says so */
  onDeleted: (message: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(() => {
    const i = data.respondents.findIndex((p) => p.id === focus);
    return i === -1 ? 0 : i;
  });
  const person = data.respondents[open];
  /**
   * Delete sits here, on the answers themselves, and not on the project's list
   * of names — moved 17 August 2026. Deleting somebody's twenty minutes from a
   * card showing only their name and email is a decision made without the
   * evidence; here the reason to delete it, a duplicate or a test run, is on
   * the screen above the button. The two-press guard is unchanged.
   */
  const [pending, start] = useTransition();
  const [warned, setWarned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = () =>
    start(async () => {
      setError(null);
      const result = await deleteResponse(person.id, warned);
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        setWarned(true);
        return;
      }
      onDeleted(`${person.name}'s answers deleted.`);
    });

  return (
    <Sheet title={`What ${clientName} said`} backLabel={backLabel} onClose={onClose}>
      {!data.respondents.length ? (
        <p className="quiet">Nobody has answered yet.</p>
      ) : (
        <>
          {/* one tab per person; with three to twenty respondents this never
              needs to become a select */}
          <div className="anspeople" role="tablist">
            {data.respondents.map((p, i) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={i === open}
                className={i === open ? 'on' : undefined}
                onClick={() => setOpen(i)}
              >
                <b>{p.name}</b>
                {/* the position, live again at question version 5. Whose view
                    this is changes what a disagreement means — a founder and a
                    new hire dissenting is not the same finding twice. Absent on
                    anything sent at versions 3 or 4, which never asked. */}
                {p.role && <span className="ansrole">{p.role}</span>}
                <span>
                  {p.answered} answered
                  {p.blank > 0 && ` · ${p.blank} blank`}
                </span>
              </button>
            ))}
          </div>

          <p className="quiet anssum">
            {person.blank > 0
              ? `${person.name} left ${person.blank} of ${person.answered + person.blank} blank. A question nobody could answer is a finding, not a gap in the data.`
              : `${person.name} answered every question.`}
          </p>

          <ul className="anslist">
            {person.answers.map((a, i) => (
              <Answer a={a} key={i} />
            ))}
          </ul>

          {/* under the answers, not above them: the reason to delete a response
              is in the response, and a Delete placed before it is pressed on a
              name alone — which is what it was on the project sheet. */}
          {error && <p className="formerror">{error}</p>}
          <button className="ansdrop" disabled={pending} onClick={remove}>
            {warned ? 'Delete anyway' : `Delete ${person.name}'s answers`}
          </button>
        </>
      )}
    </Sheet>
  );
}
