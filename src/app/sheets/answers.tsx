'use client';

import { useState, useTransition } from 'react';

import { deleteResponse } from '@/lib/team/actions';
import type { AnswerValue } from '@/lib/db/schema';
import type { ProjectAnswers, ReadableAnswer, RespondentAnswers } from '@/lib/team/answers';
import {
  answersToMarkdown,
  exportFilename,
  printableHtml,
  scaleReading,
} from '@/lib/team/export';
import { DocMark, PrintMark, SaveMark, TrashMark } from '../icons';
import MoreMenu from '../menu';
import { submitted } from '@/lib/team/when';
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
 * A scale answer, said in words.
 *
 * It read "4 of 5 · pair 1" — ten numbers about ten things the reader could not
 * see. The pair labels fixed the second half of that and left the first: "2 of
 * 5" between Serious and Fun is only meaningful if you already know that 1 is
 * the left word, which nothing on the row said. A mark on a track said it, and
 * a mark on a track is a thing you have to look at rather than read.
 *
 * So the row says which end, in words:
 *
 *     Serious – Fun             2 of 5     toward Serious
 *     Corporate – Friendly      5 of 5     at Friendly
 *     Realistic – Idealistic    3 of 5     balanced
 *
 * The point carries the row and the words support it. The team reads the
 * numbers — they are what differs between two people and what a comparison is
 * made on — so the reading sits after them, in `--ink-3`, doing the one job the
 * number cannot do alone: saying which end of the pair it is counting from.
 *
 * `scaleReading` lives in `export.ts` and is imported, so the file a person
 * downloads and the row they are looking at cannot say different things about
 * the same answer.
 *
 * The three readings are the only ones the data supports. An endpoint is `at`,
 * because the client chose the last available point and there is nothing beyond
 * it; the exact middle is `balanced`; everything else is `toward`. No degree
 * words — "strongly", "fairly" — because the scale has five points and no
 * definition of what any of them mean, and inventing one here would be the view
 * putting words in the client's mouth. How far is what the number is for, and
 * it stays on the row.
 *
 * Generalises past this questionnaire: version 2 ran these 0–10, and a scale
 * with an even number of points has no exact middle, so nothing is `balanced`
 * on one.
 *
 * English only. The client chose their language; the team reads in one.
 */

/**
 * A pair the question no longer carries still renders as its number: a survey
 * answered at an earlier version can hold an index this version dropped, and
 * losing the reading is worse than showing it unnamed.
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
        return (
          <li key={index}>
            {pair ? (
              <>
                <span className="pair">
                  {pair.left_en} – {pair.right_en}
                </span>
                <span className="pos">
                  <b>{point}</b> <i>of {value.points}</i>
                </span>
                <span className="lean">{scaleReading(point, value.points, pair.left_en, pair.right_en)}</span>
              </>
            ) : (
              <>
                <span className="pair unlabelled">pair {Number(index) + 1}</span>
                <span className="pos">
                  <b>{point}</b> <i>of {value.points}</i>
                </span>
              </>
            )}
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

/**
 * The questions, without the identity block.
 *
 * Name, position and email were the first three rows of every response, and
 * every one of them repeated something already on the screen: the name is in
 * the bar, the position and the address are in the heading directly above. Three
 * rows of "Your name / ชื่อของคุณ / Buk" before the first thing anybody came
 * here to read.
 *
 * They are dropped from the *view* only. The export keeps them — a file that
 * leaves the app has no bar and no heading to carry them, and a set of answers
 * with no name on it is a set of answers nobody can attribute. See
 * `answersToMarkdown`, which takes `data` untouched.
 */
const asked = (p: RespondentAnswers) => p.answers.filter((a) => a.blockKey !== 'identity');
const blanks = (p: RespondentAnswers) => asked(p).filter((a) => a.value === null).length;

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
  /**
   * One person, and only ever the one that was opened.
   *
   * The sheet carried a tab per respondent until 18 August 2026, and the tabs
   * went because of where it is reached from: every route in is a click on a
   * named person, on the project. Arriving on somebody you chose, with four
   * other names above their answers, offers a switch nobody asked for and makes
   * the page about the list rather than about them.
   *
   * `data` still holds everybody, which is what lets Export offer the whole set
   * from here without a second read.
   *
   * The fallback survives a stale `focus` — a response deleted in another tab
   * would otherwise index past the end and take the sheet down with it.
   */
  const person = data.respondents.find((p) => p.id === focus) ?? data.respondents[0];
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

  /**
   * The file, handed over by the browser rather than fetched from anywhere.
   *
   * `ProjectAnswers` is already loaded for the sheet, so the export is built
   * from exactly what is on screen — no request, no second read of the
   * database, and no way for the file to disagree with the view. The object URL
   * is revoked on the next frame; keeping it alive holds the blob in memory for
   * the life of the document.
   *
   * One person only. It could export everybody from here — `data` holds them —
   * and that is exactly why it should not: this sheet is one response, and an
   * item on it that quietly reaches past its subject is a file somebody sends
   * without meaning to. The whole set is on the project, which is the thing
   * that has a whole set.
   */
  const download = (person: RespondentAnswers) => {
    const blob = new Blob([answersToMarkdown(data, clientName, person)], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(clientName, person);
    a.click();
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  };

  /**
   * The document opens in its own window and prints itself.
   *
   * `printableHtml` builds a complete page — see the note there for why it is
   * not this sheet with its chrome hidden, which produced a blank page because
   * the `<dialog>` is nested rather than portalled, and would have been a poor
   * document even when it worked.
   *
   * A pop-up blocker can refuse the window; that is the one failure worth
   * saying out loud, because nothing else on screen would change and the team
   * would conclude the button is broken.
   */
  const [printError, setPrintError] = useState<string | null>(null);
  const print = (person: RespondentAnswers) => {
    const w = window.open('', '_blank');
    if (!w) {
      setPrintError('Your browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }
    setPrintError(null);
    w.document.write(printableHtml(data, clientName, person));
    w.document.close();
    /* the fonts have to be resolved before the dialog freezes the page, or a
       Thai line can measure against a fallback and re-flow behind the preview */
    const go = () => {
      w.focus();
      w.print();
    };
    if (w.document.fonts?.ready) w.document.fonts.ready.then(go);
    else w.addEventListener('load', go);
  };

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
    <Sheet
      /**
       * Whose answers, and when they were given.
       *
       * It read "What ARUN+ said" — the *client's* name, on a sheet that shows
       * one person. Five respondents from one client all carried the same
       * title, so the bar said nothing about which of them you were reading.
       *
       * Two lines, the shape the project sheet's bar takes: the name, and under
       * it the moment it was submitted. The date is the second fact worth
       * having up there because it is the one thing that orders five otherwise
       * identical responses — who answered before the deadline, who came in
       * after a nudge.
       *
       * No count of answered or blank. Every question is answered on almost
       * every one of these, so the number is the same on all five and says
       * nothing; where it is not, `.anssum` says so in words directly under the
       * heading, which is where a fact that varies belongs.
       */
      title={
        <>
          <b>{person.name}</b>
          <i>{submitted(person.submittedAt)}</i>
        </>
      }
      backLabel={backLabel}
      onClose={onClose}
      /**
       * Two controls, and they are the two things you do to a response: take a
       * copy of it, or remove it.
       *
       * It was one ellipsis holding both. An ellipsis is right when the items
       * behind it are the leftovers — the HIG's "less important actions" — and
       * these are not leftovers, they are the entire set. Naming them costs two
       * discs on a bar that has room for them and saves a press to find out
       * what is there.
       *
       * Download keeps a popover because it has two formats: the mark names the
       * act and the menu names the shape, which is one decision each rather
       * than two buttons that differ only in file extension.
       *
       * **Delete moved up here from the foot of the sheet, and that is a real
       * trade.** It sat under the answers deliberately: the reason to delete a
       * response is in the response, and a Delete above the evidence is one
       * pressed on a name alone — which is exactly why it was moved off the
       * project sheet in the first place. What protects it now is the guard
       * rather than the position, and the guard is the stronger half: the first
       * press only ever opens this panel, and the server refuses outright if a
       * confirmed insights read these answers.
       */
      actions={
        data.respondents.length ? (
          <>
            <MoreMenu label={`Download ${person.name}'s answers`} icon={<SaveMark />}>
              {(close) => (
                <>
                  <button
                    onClick={() => {
                      download(person);
                      close();
                    }}
                  >
                    <DocMark />
                    <span>Markdown</span>
                  </button>
                  <button
                    onClick={() => {
                      close();
                      print(person);
                    }}
                  >
                    <PrintMark />
                    <span>PDF</span>
                  </button>
                </>
              )}
            </MoreMenu>
            <MoreMenu label={`Delete ${person.name}'s answers`} icon={<TrashMark />} danger>
              {(close) => (
                <div className="delconfirm danger">
                  {/* the button says permanently; this says what goes */}
                  <p>Removes every answer {person.name} gave.</p>
                  <div className="iacts">
                    <button
                      className="btn btn-danger"
                      disabled={pending}
                      onClick={() => {
                        close();
                        remove();
                      }}
                    >
                      {pending ? 'Deleting…' : 'Delete'}
                    </button>
                    <button className="btn btn-quiet" onClick={close}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </MoreMenu>
          </>
        ) : null
      }
    >
      {!data.respondents.length ? (
        <p className="quiet">Nobody has answered yet.</p>
      ) : (
        <>
          {[person].map((p) => (
            <section className="ansperson" key={p.id}>
              {/* Role and email. The name is in the bar, which is sticky and
                  survives the scroll; these two are not, and both earn their
                  place — the position changes what a disagreement means, and
                  the address is how somebody gets followed up. */}
              {(p.role || p.email) && (
                <h3 className="ansname">
                  {p.role && <span>{p.role}</span>}
                  {p.email && <span>{p.email}</span>}
                </h3>
              )}
              {/**
               * A blank is worth a sentence. A full response is not.
               *
               * This said "Answered every question." on almost every response,
               * which is a line that is true, identical on all of them, and
               * therefore says nothing — a survey is not sent with a blank in
               * it, so the full case is the case. What is left is the exception,
               * and the exception is a real finding: DESIGN.md's insight spec
               * calls a question nobody could answer the most valuable signal
               * there is, so it keeps its sentence.
               *
               * Counted over the questions on screen rather than every row —
               * the identity fields are not shown and would put a "of 24" over
               * a list of twenty-one.
               */}
              {blanks(p) > 0 && (
                <p className="quiet anssum">
                  Left {blanks(p)} of {asked(p).length} blank. A question nobody could
                  answer is a finding, not a gap in the data.
                </p>
              )}

              <ul className="anslist">
                {asked(p).map((a, i) => (
                  <Answer a={a} key={i} />
                ))}
              </ul>
            </section>
          ))}

          {/* The errors stay at the foot, where the answers they are about are.
              A refusal from the server — a confirmed insights read these — is a
              sentence to read, and a popover that has closed cannot hold it. */}
          {printError && <p className="formerror">{printError}</p>}
          {error && <p className="formerror">{error}</p>}
          {warned && (
            <button className="ansdrop" disabled={pending} onClick={remove}>
              Delete anyway
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
