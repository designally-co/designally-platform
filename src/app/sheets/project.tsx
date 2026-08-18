'use client';

import { useState, useTransition } from 'react';

import {
  archiveProject,
  deleteProject,
  readAnswers,
  closeCollection,
  reanalyse,
  reopenCollection,
  setDueDate,
} from '@/lib/team/actions';
import type { ProjectView } from '@/lib/team/projects';
import { answersToMarkdown, exportFilename, printableHtml } from '@/lib/team/export';
import { ArchiveMark, DocMark, LockMark, PrintMark, SaveMark, TrashMark, UndoMark } from '../icons';
import { submitted } from '@/lib/team/when';
import ShareLink from './share';
import MoreMenu from '../menu';
import Sheet from './sheet';

/**
 * Everything about one client. Four sections — who answered · right now · the
 * link · documents — and a toolbar holding everything that can be *done* to it:
 * copy the link, close collection or reopen it, archive. The job ends at the
 * summary.
 *
 * **Who answered comes before the action**, reordered 17 August 2026. The order
 * used to follow docs/complete-flow.md, which is the order things *happen* —
 * but a team member opening this sheet is deciding whether there is enough to
 * work with, and the answer to that is the list of people. Putting the button
 * first asked them to decide above the evidence.
 *
 * The documents section has nothing to show until an analysis exists. It says
 * so rather than being hidden, because "nothing produced yet" is a true
 * statement about the project and an empty space is not.
 */
export default function ProjectSheet({
  project: p,
  origin,
  onOpenInsights,
  onReadAnswers,
  onClose,
  onActed,
}: {
  project: ProjectView;
  origin: string;
  onOpenInsights: () => void;
  onReadAnswers: (responseId: string) => void;
  onClose: () => void;
  onActed: (message: string) => void;
}) {
  /**
   * Which confirmation is open — one field, not two flags.
   *
   * Archive and Delete each had their own boolean, so both panels could be open
   * at once: a menu asking two irreversible questions at the same time, with
   * two red buttons in it and nothing saying which one you had opened. Opening
   * either now closes the other because there is only one value to hold, rather
   * than because two handlers each remember to reset the other's flag.
   */
  const [confirming, setConfirming] = useState<'close' | 'archive' | 'delete' | null>(null);
  const [typed, setTyped] = useState('');
  /**
   * The typed name, back on 18 August 2026 after a few hours without it.
   *
   * Trimmed and case-insensitive, and checked again on the server: this is a
   * guard against acting without meaning to, not a spelling test, and the names
   * are often Thai where a trailing space is invisible.
   */
  const matches = typed.trim().toLocaleLowerCase() === p.clientName.trim().toLocaleLowerCase();

  /**
   * Everybody's answers, from the project — which is the thing that has an
   * everybody.
   *
   * These two were on the answers sheet beside that person's own export, and
   * they came here on 18 August 2026. That sheet is one response; an item on it
   * quietly reaching past its subject is a file somebody sends without meaning
   * to, and the difference between "this person" and "all five" is one line in
   * a menu read at speed.
   *
   * The answers are fetched here rather than held: the project list ships
   * without them for a reason — every answer of every respondent on every live
   * project is a great deal of text — so this pays for the read only when
   * somebody asks for the file.
   */
  const exportAll = (as: 'md' | 'pdf') =>
    start(async () => {
      setError(null);
      /* No "reading…" label on the button: `close()` unmounts the menu before
         this resolves, so it could never render. The file arriving is the
         feedback, and a failure lands in the sheet's own error line. */
      const data = await readAnswers(p.id);
      if (!data || !data.respondents.length) {
        setError('There are no answers to export yet.');
        return;
      }
      if (as === 'md') {
        const blob = new Blob([answersToMarkdown(data, p.clientName)], {
          type: 'text/markdown;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFilename(p.clientName);
        a.click();
        requestAnimationFrame(() => URL.revokeObjectURL(url));
        return;
      }
      const w = window.open('', '_blank');
      if (!w) {
        setError('Your browser blocked the print window. Allow pop-ups for this site and try again.');
        return;
      }
      w.document.write(printableHtml(data, p.clientName));
      w.document.close();
      const go = () => {
        w.focus();
        w.print();
      };
      if (w.document.fonts?.ready) w.document.fonts.ready.then(go);
      else w.addEventListener('load', go);
    });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  /**
   * Whose answers the analysis should read. Null is everyone, which is the
   * default and nearly always what happens.
   *
   * **One value for the whole sheet.** It used to sit inside the *right now*
   * card, which meant the card and the insights section would each have held
   * their own — two lists of the same checkboxes, disagreeing, with the button
   * you happened to press deciding which one counted. The Insights section owns
   * the picker now and the card's own actions read the same value.
   */
  const [only, setOnly] = useState<string[] | null>(null);

  /**
   * The banner's own confirmation, separate from the More menu's.
   *
   * Closing collection from here is gate 1 exactly as it is from the menu — it
   * stamps `closed_by`, it stops the link, and it starts a paid analysis — so it
   * asks first for the same reasons. It cannot share `confirming`: that value
   * drives the menu, and one field would open both panels at once.
   */
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  /**
   * The caller's sentence, unless the server has a better one.
   *
   * `message` is written here, before the action runs, so it can only say the
   * thing that is always true — "Archived." An action that did more than the
   * button named returns a `warning` saying what, and that is the sentence
   * worth reading: archiving a project whose survey was still open also closes
   * collection, and a toast reading "Archived." leaves the person to discover
   * the link is now dead by hearing about it from the client.
   *
   * It is `warning` and not a second success field because that is the shape
   * `ActionResult` already has and what gate 1 already uses for "closed, but
   * the insights were not written" — succeeded, with something you need to know.
   */
  const run = (fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>, message: string) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      onActed(result.warning ?? message);
    });

  /**
   * Write the insights, then show them.
   *
   * `run` closes the sheet and toasts, which is right for archiving and wrong
   * for this: the team asked to press generate and *see* what came back, so
   * this ends on the insights sheet instead of on a sentence about it.
   *
   * Two actions behind one button, because there are two ways to arrive here
   * and only one of them is a second run. An open survey has no settled set of
   * answers to read — `reanalyse` refuses one — so closing is what produces the
   * first analysis, and it is gate 1 while it does. The label says which is
   * about to happen.
   */
  const generate = () =>
    start(async () => {
      setError(null);
      setConfirmGenerate(false);
      const result = p.closedOn
        ? await reanalyse(p.id, only ?? undefined)
        : await closeCollection(p.surveyId!, only ?? undefined);
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      /* A close with nobody to read comes back ok with a warning and no
         analysis — there is nothing to open, so say it rather than opening an
         empty sheet. */
      if (result.warning) {
        onActed(result.warning);
        return;
      }
      onOpenInsights();
    });

  const link = p.token ? `${origin}/s/${p.token}` : null;

  /**
   * Everything this project can have done to it, on the trailing edge.
   *
   * Share is the one action taken often enough to stay visible — sending the
   * link again is most of what this sheet is opened for. It is a bare glyph per
   * the HIG, with the verb in the tooltip and the accessible name.
   *
   * It was a chain link that copied on press, with the URL itself in a section
   * headed "The link" further down the sheet. Two halves of one job in two
   * places: the button gave you the link without showing it, the section showed
   * it without giving it to you, and neither put it on a phone. Both are the
   * share panel now — see share.tsx.
   *
   * The rest go behind More, per the HIG: "Prioritize less important actions
   * for inclusion in the More menu." Closing collection keeps its prominent
   * button in the card above whenever the app is actually asking; what is here
   * is the always-available version, for a team that knows on day one that four
   * answers from the right people are enough.
   *
   * Archive confirms inside the menu rather than closing it. It moved here from
   * a section at the foot of the sheet on 17 August 2026, and the sentence that
   * section existed to say — nothing is deleted — comes with it, because that
   * is the fact somebody needs at the moment they press it.
   */
  const actions = (
    <>
      {link && p.token && (
        <ShareLink token={p.token} url={link} closed={!!p.closedOn} />
      )}
      {/**
       * Download has its own disc, the way it does on a response.
       *
       * It was two items inside More, which put taking a copy of the answers in
       * the same drawer as closing collection and deleting the project — one of
       * those is a thing you do to read something and the rest change the
       * project. A person looking for the file had to open a menu of decisions
       * to find out it was in there.
       *
       * Same control as the answers sheet: the mark names the act, the popover
       * names the format. What differs is only the subject, and each says its
       * own in the accessible name — "Download all 5 answers" against
       * "Download คุณธนวัฒน์'s answers".
       */}
      {p.answers > 0 && (
        <MoreMenu label={`Download all ${p.answers} answers`} icon={<SaveMark />}>
          {(close) => (
            <>
              <button
                disabled={pending}
                onClick={() => {
                  close();
                  exportAll('md');
                }}
              >
                <DocMark />
                <span>Markdown</span>
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  close();
                  exportAll('pdf');
                }}
              >
                <PrintMark />
                <span>PDF</span>
              </button>
            </>
          )}
        </MoreMenu>
      )}
      {/* Closing the menu forgets which confirmation was open. It is held on
          the sheet rather than in the menu, so without this a person who opened
          Delete, thought better of it and clicked away found it still expanded —
          and a red panel waiting behind a button they pressed for something
          else. */}
      <MoreMenu
        onClose={() => {
          setConfirming(null);
          setTyped('');
        }}
      >
        {(close) => (
          <>
            {/**
             * Gate 1 asks first, like the two under it.
             *
             * It was the one gate that fired on the press. Reopening exists, so
             * it was never unrecoverable — but it is not free either: closing
             * runs the analysis, which is a paid call and a minute of waiting,
             * and it changes what the client sees on the link. A menu row that
             * does all that between two rows that both ask twice is the one an
             * elbow finds.
             *
             * The line under it is what a person needs to know before pressing
             * and cannot see from the row: that the analysis starts here, and
             * that this is reversible.
             */}
            {!p.closedOn &&
              p.surveyId &&
              p.answers > 0 &&
              (confirming === 'close' ? (
                <div className="delconfirm">
                  <p>The analysis is written now. You can reopen it afterwards.</p>
                  <button
                    disabled={pending}
                    onClick={() => {
                      close();
                      run(() => closeCollection(p.surveyId!), 'Collection closed.');
                    }}
                  >
                    {pending ? 'Closing…' : 'Close collection'}
                  </button>
                  <button onClick={() => setConfirming(null)}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirming('close')}>
                  <LockMark />
                  <span>Close collection</span>
                </button>
              ))}
            {p.closedOn && (
              <button
                disabled={pending}
                onClick={() => {
                  close();
                  run(() => reopenCollection(p.id), 'Collection reopened.');
                }}
              >
                <UndoMark />
                <span>Reopen for answers</span>
              </button>
            )}
            {confirming === 'archive' ? (
              /* One line, then the two answers to it. The sentence used to sit
                 *between* the buttons, which put the reason for the decision
                 after one of the ways of making it. */
              <div className="delconfirm">
                <p>Nothing is deleted — it stays searchable.</p>
                <button
                  disabled={pending}
                  onClick={() => {
                    close();
                    run(() => archiveProject(p.id), `${p.clientName} archived.`);
                  }}
                >
                  {pending ? 'Archiving…' : 'Archive project'}
                </button>
                <button onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirming('archive')}>
                <ArchiveMark />
                <span>Archive project</span>
              </button>
            )}

            {/**
             * Delete, under archive and looking like it.
             *
             * Archive is the filing decision and stays the ordinary one — it is
             * reversible and it keeps the answers. This is for the other case,
             * the test project and the client that never signed, which archiving
             * only moves somewhere they still are.
             *
             * The confirmation is the client's name, typed. Everything else
             * destructive here uses a two-press guard, which is proportional to
             * deleting one response — one person's twenty minutes, on a button
             * that says whose. This takes every response on the project and the
             * insights written from them, and a guard you can clear by pressing
             * twice in the same second is not proportional to that.
             */}
            {confirming === 'delete' ? (
              /**
               * A short line, the name typed, and two buttons.
               *
               * The sentence ran to two and a half lines saying what a count and
               * three words say: how many answers go, that the insights go with
               * them, and that nothing comes back.
               *
               * The typed name is the guard, restored. Everything else
               * destructive here is one press inside a panel, which is
               * proportional to deleting one response — a mistake costs one
               * person's twenty minutes. This takes every response on the
               * project, and a panel you can clear by pressing twice in the same
               * second is not proportional to that.
               */
              <div className="delconfirm danger">
                {/**
                 * One line: what to type, and what typing it does.
                 *
                 * It counted the answers, and a count is a partial inventory —
                 * a project holds the insights written from those answers too,
                 * and it will hold whatever else is added to it. Naming some of
                 * what goes is worse than naming none, because it reads as the
                 * complete list. "The project" is the complete list.
                 *
                 * No "no undo" either: the button below says permanently, and a
                 * warning given twice in four inches reads as a template rather
                 * than a warning.
                 */}
                <label htmlFor={`del-${p.id}`}>
                  Type <b>{p.clientName}</b> to delete the project.
                </label>
                <input
                  id={`del-${p.id}`}
                  className="input"
                  value={typed}
                  autoComplete="off"
                  disabled={pending}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && matches) {
                      close();
                      run(() => deleteProject(p.id, typed), `${p.clientName} deleted.`);
                    }
                  }}
                />
                <button
                  className="danger"
                  /* unavailable until the name is right, rather than failing
                     after the press */
                  disabled={pending || !matches}
                  onClick={() => {
                    close();
                    run(() => deleteProject(p.id, typed), `${p.clientName} deleted.`);
                  }}
                >
                  {pending ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => {
                    setConfirming(null);
                    setTyped('');
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button className="danger" onClick={() => setConfirming('delete')}>
                <TrashMark />
                <span>Delete project</span>
              </button>
            )}
          </>
        )}
      </MoreMenu>
    </>
  );

  /**
   * The bar says which project, not that this is one.
   *
   * Its title read "Project", which is true of the sheet and useless about it.
   * The bar is `position: sticky` and the client's name is an `<h1>` in the body
   * that scrolls out from under it — the HIG's large-title pattern, where the
   * small title exists precisely for the moment the large one has gone. Left as
   * a category it told somebody reading answers halfway down the sheet that
   * they were looking at a project, which they knew, and not at whose.
   *
   * Both stay, and that is the pattern working rather than a repetition: the
   * two are never legible at the same moment for long.
   *
   * Two lines, because the name alone is not always enough to place a project:
   * a client can hold a Brand and a Design at once, and those are different
   * questionnaires with different answers. The package under the name is what
   * the body's own head says under its `<h1>`, so the bar keeps saying it after
   * that has scrolled away.
   *
   * The project code was on this line for a few hours and is gone with the rest
   * of it — see `createSurvey`. It was shown here and nowhere else, searched by
   * nothing, and identified nothing the app does not already have an id for.
   */
  return (
    <Sheet
      title={
        <>
          <b>{p.clientName}</b>
          <i>{p.packageLabel}</i>
        </>
      }
      actions={actions}
      backLabel="Back to all projects"
      onClose={onClose}
    >

      {/* who answered */}
      <div className="pd-sec">
        <h2>Who answered</h2>
        {p.people.length ? (
          <>
            {/* The analysis reports what the team might miss; reading what
                was actually said is their own work, and this is where it
                starts — which is why this section is first now, above the
                action. The team reads, then decides.

                There was a "Read what they said" button under this list until
                17 August 2026. It opened on whoever answered first, so anybody
                wanting Khun Tanawat pressed a general button and then hunted
                for him in the tabs. The card is the control, and it opens on
                him. Delete went with it, to the answers themselves — see
                sheets/answers.tsx. */}
            <div className="pd-people">
              {p.people.map((person) => (
                <button className="person" key={person.id} onClick={() => onReadAnswers(person.id)}>
                  <b>{person.name}</b>
                  {/* When, not the address. The email said nothing about the
                      answer underneath it and read as a second name; the time
                      is what orders five responses to one survey and what tells
                      you whether the person you chased last week has replied.
                      It is still on their own sheet and in both exports, which
                      is where somebody actually writing to them would be. */}
                  <span className="at">{submitted(person.submittedAt)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="quiet">Nobody has answered yet.</p>
        )}
      </div>

      {/* right now */}
      <div className="pd-now">
        <div className="lab">{p.action ? 'NEEDS YOUR TEAM' : 'WAITING'}</div>
        {p.action ? (
          <>
            <p>
              <b>{p.action.say}</b> {p.action.emphasis}
            </p>
            <p className="when">{p.action.when}</p>
            {/**
             * This card says what is going on. It no longer does anything about
             * it, as of 18 August 2026.
             *
             * It carried a primary button branching three ways — close, write
             * the insights, review them — and every one of those is what the
             * Insights section below now does, with the picker attached. Two
             * buttons a thumb apart running the same analysis is how you get a
             * team choosing four respondents in one place and generating from
             * all five in the other.
             *
             * What is left is the half the section cannot say: *why now*. The
             * date has passed, or it has been quiet five days — a reason, and
             * the date it is reckoned from.
             */}
          </>
        ) : (
          <>
            <p>
              {p.closedOn
                ? `Collection closed on ${p.closedOn}${p.closedByName ? ` by ${p.closedByName}` : ''}, with ${p.answers} ${p.answers === 1 ? 'answer' : 'answers'}.`
                : p.answers
                  ? `${p.answers} ${p.answers === 1 ? 'answer' : 'answers'} so far, the last one ${p.lastAnswerOn}. Nothing for your team to do — the app will speak up if it goes quiet.`
                  : 'The link has been sent. No answers yet.'}
            </p>

            {/**
             * Closing is always available, not only once the app has noticed a
             * quiet survey (docs/team-workflow-after-survey.md). Only a person
             * knows whether four answers from the right people beat ten from
             * the wrong ones, and they may know that on day one. The five-day
             * prompt is the app catching up, never the gate opening.
             *
             * The always-available version lives in the toolbar's More menu
             * from 17 August 2026. The prominent button stays in this card
             * whenever the app is the one asking.
             */}
          </>
        )}
      </div>

      {/**
       * The date, and no longer the link.
       *
       * "The link" headed this section with the URL in a box beneath it, and
       * both are in the share panel on the toolbar now — the link and the way
       * to send it belong to one control, and this section is about *when* the
       * answers are wanted rather than where they go.
       */}
      {/* Closed, and no date ever set, leaves nothing to put under the heading —
          and a heading with nothing under it is a section that failed to load.
          The editor is only for a survey still taking answers; a closed one
          keeps the date as the record of what the client was told. */}
      {p.token && (!p.closedOn || p.dueOn) && (
        <div className="pd-sec">
          <h2>The date</h2>

          {/**
           * The date the team asked for. Two weeks at creation, changed here.
           *
           * It is deliberately not a switch that closes anything: the client
           * sees this date on the welcome screen, and once it passes the
           * project appears in Needs you asking whether to close. A person
           * still decides — rule 1, and the gate records who acted. Clearing
           * it means no date, which is how every survey sent before this
           * existed already behaves.
           */}
          {!p.closedOn && (
            <div className="pd-due">
              <label htmlFor={`due-${p.id}`}>Asking for answers by</label>
              <input
                id={`due-${p.id}`}
                type="date"
                className="input"
                defaultValue={p.dueDay ?? ''}
                disabled={pending}
                onChange={(e) =>
                  run(
                    () => setDueDate(p.id, e.target.value || null),
                    e.target.value ? 'Date updated. The client sees it on the welcome screen.' : 'Date cleared.',
                  )
                }
              />
              <span className="hintline">
                The client sees this. It does not close the survey — you do.
              </span>
            </div>
          )}
          {p.closedOn && p.dueOn && (
            <p className="quiet">You asked for answers by {p.dueOn}. Collection is closed.</p>
          )}
          {/* Reopening is in the toolbar's More menu. A stakeholder replying the
              day after collection closed is not an edge case, and reopening
              leaves the insights alone: what they say was true of the answers
              they were written from, and they keep saying so. */}
        </div>
      )}

      {/**
       * The insights, and the one place they are made.
       *
       * This was a section called *Documents* holding a single button, and it
       * was a plural because there used to be two things in it — the insights
       * and the brief the designer was handed after the kick-off. The brief went
       * with the kick-off on 17 August 2026, so it had been a shelf built for a
       * library that was cancelled.
       *
       * The team asked for this shape on 18 August 2026: the answers, then a
       * banner where you choose which of them to read, press once, and see what
       * came back. That is three things that were in three places — the picker
       * inside the *right now* card, the button that ran the analysis, and a
       * document row that opened the result.
       *
       * **The picker is open, not behind a link.** It was hidden until asked for
       * on the argument that the answer is "everyone" almost every time, which
       * is true and is why everyone stays ticked. But choosing is the first half
       * of what the team described doing here, and a control you have to go
       * looking for is not offered.
       */}
      <div className="pd-sec pd-insights">
        <h2>Insights</h2>

        {!p.people.length ? (
          <p className="quiet">
            Nobody has answered yet. The analysis reads the answers, so it has nothing to read.
          </p>
        ) : (
          <>
            {/* What exists, before what can be done about it. */}
            {p.insights ? (
              <p className="isay">
                <b>Written {p.insightsWrittenOn}</b>
                {p.insightsVersions.length > 1
                  ? ` · ${p.insightsVersions.length} versions kept`
                  : ''}
              </p>
            ) : (
              <p className="isay">
                <b>Not written yet</b>
                {p.closedOn ? ' · collection is closed' : ''}
              </p>
            )}

            {/**
             * Whose answers to read. One row each, everyone ticked.
             *
             * A single respondent gets no picker: a checkbox whose only legal
             * state is ticked is furniture.
             */}
            {p.people.length > 1 && (
              <div className="whoreads">
                <p className="hintline">Read the answers of:</p>
                {p.people.map((person) => {
                  const on = only === null || only.includes(person.id);
                  return (
                    <label key={person.id} className="pickwho">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={pending}
                        onChange={() => {
                          const base = only ?? p.people.map((x) => x.id);
                          const next = on
                            ? base.filter((id) => id !== person.id)
                            : [...base, person.id];
                          /* everyone selected is the same as no selection — keep
                             it null so the run records it that way */
                          setOnly(next.length === p.people.length ? null : next);
                        }}
                      />
                      <span>{person.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="iacts">
              {/**
               * Generating while the survey is open closes it on the way, and
               * that is gate 1 — so it asks first, the way every other gate on
               * this sheet does. Once closed it is a re-run and asks nothing:
               * every version is kept and nothing is overwritten.
               */}
              {confirmGenerate ? (
                <div className="delconfirm">
                  <p>
                    This closes collection first — the link stops taking answers, and your name
                    goes on it.
                  </p>
                  {/* Wrapped, so `.delconfirm > button` does not reach them:
                      that rule compacts a menu row, and these two are buttons on
                      a sheet standing next to other buttons on the same sheet. */}
                  <div className="iacts">
                    <button className="btn btn-primary" disabled={pending} onClick={generate}>
                      {pending ? 'Working…' : 'Close and generate'}
                    </button>
                    <button className="btn btn-quiet" onClick={() => setConfirmGenerate(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={pending || only?.length === 0}
                  onClick={() => (p.closedOn ? generate() : setConfirmGenerate(true))}
                >
                  {pending
                    ? 'Working…'
                    : p.closedOn
                      ? p.insights
                        ? 'Generate again'
                        : 'Generate insights'
                      : 'Close collection and generate'}
                </button>
              )}

              {p.insights && (
                <button className="btn btn-quiet" disabled={pending} onClick={onOpenInsights}>
                  Open the insights
                </button>
              )}
            </div>

            {only?.length === 0 && (
              <p className="hintline">Tick at least one person for the analysis to read.</p>
            )}
          </>
        )}
      </div>

      {error && <p className="formerror">{error}</p>}

      {/* Gate 3 — archive — is in the toolbar's More menu, with the sentence
          this section existed to say attached to it: nothing is deleted. Only
          your team can do it, and the app never archives anything by itself. */}
    </Sheet>
  );
}
