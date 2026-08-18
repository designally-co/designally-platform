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
import MoreMenu from '../menu';
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
   */
  const download = (person?: RespondentAnswers) => {
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
  const print = (person?: RespondentAnswers) => {
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
      title={`What ${clientName} said`}
      backLabel={backLabel}
      onClose={onClose}
      actions={
        data.respondents.length ? (
          <MoreMenu label="Export">
            {(close) => (
              <>
                <button
                  onClick={() => {
                    download(person);
                    close();
                  }}
                >
                  Download {person.name}&rsquo;s answers · Markdown
                </button>
                <button
                  onClick={() => {
                    download();
                    close();
                  }}
                >
                  Download all {data.respondents.length} · Markdown
                </button>
                <button
                  onClick={() => {
                    close();
                    print(person);
                  }}
                >
                  Print {person.name}&rsquo;s answers · PDF
                </button>
                <button
                  onClick={() => {
                    close();
                    print();
                  }}
                >
                  Print all {data.respondents.length} · PDF
                </button>
              </>
            )}
          </MoreMenu>
        ) : null
      }
    >
      {!data.respondents.length ? (
        <p className="quiet">Nobody has answered yet.</p>
      ) : (
        <>
          {[person].map((p) => (
            <section className="ansperson" key={p.id}>
              {/**
               * Whose answers these are, which the tabs used to say.
               *
               * The sheet's own title names the *client* — "What ARUN+ said" —
               * so without this the page had five people's worth of answers on
               * it and no name anywhere. The position is here for the reason it
               * was on the tab: a founder and a new hire dissenting is not the
               * same finding twice.
               */}
              <h3 className="ansname">
                {p.name}
                {p.role && <span>{p.role}</span>}
                {p.email && <span>{p.email}</span>}
              </h3>
              {/* No name in it any more: it named the person because the only
                  other place they appeared was a tab across the top. The
                  heading is the line directly above this one now, and a Thai
                  name is long enough that repeating it here reads as a stutter
                  rather than as a subject. */}
              <p className="quiet anssum">
                {p.blank > 0
                  ? `Left ${p.blank} of ${p.answered + p.blank} blank. A question nobody could answer is a finding, not a gap in the data.`
                  : 'Answered every question.'}
              </p>

              <ul className="anslist">
                {p.answers.map((a, i) => (
                  <Answer a={a} key={i} />
                ))}
              </ul>
            </section>
          ))}

          {/* under the answers, not above them: the reason to delete a response
              is in the response, and a Delete placed before it is pressed on a
              name alone — which is what it was on the project sheet. */}
          {printError && <p className="formerror">{printError}</p>}
          {error && <p className="formerror">{error}</p>}
          <button className="ansdrop" disabled={pending} onClick={remove}>
            {warned ? 'Delete anyway' : `Delete ${person.name}'s answers`}
          </button>
        </>
      )}
    </Sheet>
  );
}
