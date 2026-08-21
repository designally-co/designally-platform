'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import {
  archiveProject,
  deleteProject,
  readAnswers,
  closeCollection,
  reanalyse,
  reopenCollection,
  setDueDate,
} from '@/lib/team/actions';
import { dayIn, defaultDueDay } from '@/lib/team/due';
import type { ProjectView } from '@/lib/team/projects';
import { answersToMarkdown, exportFilename, printableHtml } from '@/lib/team/export';
import {
  ArchiveMark,
  CalendarMark,
  DocMark,
  LockMark,
  DownMark,
  PrevMark,
  PrintMark,
  SaveMark,
  TrashMark,
  UndoMark,
} from '../icons';
import { submitted } from '@/lib/team/when';
import { useAnchored, useDismiss } from '../anchored';
import Calendar from '../calendar';
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
/** "26 September 2026" — the way the team app writes a date everywhere else. */
function niceDay(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProjectSheet({
  project: p,
  origin,
  onOpenInsights,
  onReadAnswers,
  onClose,
  onActed,
  onToast,
}: {
  project: ProjectView;
  origin: string;
  onOpenInsights: () => void;
  onReadAnswers: (responseId: string) => void;
  onClose: () => void;
  onActed: (message: string) => void;
  /** says it happened without closing the sheet — see `runStay` */
  onToast: (message: string) => void;
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
  const [confirming, setConfirming] = useState<
    'close' | 'archive' | 'delete' | 'download' | 'due' | 'reopen' | null
  >(null);
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

  /** Whether the subset dropdown is open. Shut is the ordinary case: read everyone. */
  const [picking, setPicking] = useState(false);
  const split = useRef<HTMLDivElement>(null);
  const pickBtn = useRef<HTMLButtonElement>(null);
  /* 340 is the menu's own `max-height` — it only decides whether to open down
     or up, and it was 200, which a five-person list already passed. A list that
     is taller than the estimate opens downward off the bottom of the screen. */
  /**
   * The picker, measured rather than estimated once it exists.
   *
   * There is rarely room below this control — it sits at the foot of the
   * insights panel, itself near the foot of the sheet — so the panel almost
   * always opens upward, and upward is the direction where a wrong height
   * becomes a visible gap. See `useAnchored`.
   */
  const pickPanel = useRef<HTMLDivElement>(null);
  const at = useAnchored(picking, split, 260, 340, 'left', pickPanel);
  /* Focus goes back to the control that opened it. Escape used to drop it on
     the sheet's scroller, which puts a keyboard user at the top of the sheet
     having pressed one key. */
  useDismiss(
    picking,
    split,
    useCallback(() => {
      setPicking(false);
      pickBtn.current?.focus();
    }, []),
  );

  /**
   * The day somebody has pointed at in the menu's calendar, before saving it.
   *
   * It was the Collection bar's date field — a live control on a surface people
   * open to read answers. It is a scratch value now: set when *Change due date*
   * or *Reopen collection* opens, thrown away when either closes, so there is
   * never a half-changed date sitting on a sheet nobody is editing.
   */
  const [picked, setPicked] = useState('');
  const today = dayIn(new Date());
  /**
   * The date the client was told has gone by, and the link is refusing them.
   *
   * `p.dueDay` and not `picked` — the saved date, not the one somebody has
   * pointed at in the calendar. Choosing tomorrow for a shut survey should not
   * announce that it is open again before anybody has pressed Reopen.
   */
  const overdue = !!p.dueDay && p.dueDay < today;

  /**
   * **Closed means no answer is accepted, and there are two ways in.**
   * Confirmed by the team 19 August 2026.
   *
   * A person presses Close now, or the date arrives. The client meets the same
   * screen either way, so the app says the same word either way — it used to
   * call one of them closed and describe the other, which left a survey that
   * had been refusing people for a week reading as open, with the analysis
   * telling the team to close it first.
   *
   * **`closed_at` still means only the first of them, and that is the point.**
   * It is the record that a person acted and which person, and a date cannot
   * write it — see rule 2. So this is derived and never stored: one boolean for
   * *can anybody still answer*, and the columns underneath left saying exactly
   * what they always said.
   */
  const shut = !!p.closedOn || overdue;

  /* `mine` went on 20 August 2026 with the last thing that read it. It marked
     the one action kind this panel could answer — `write-insights` — so that
     the accent eyebrow and the action's `when` line appeared here and not for
     the kinds another control resolves. Both are gone: the panel is the accent
     now, at all times, and it no longer reports state at all. */

  /**
   * The analysis gets its own pending flag.
   *
   * It shared one `useTransition` with every other action on the sheet, so
   * pressing Generate disabled the lot — the date field, Reopen, Archive,
   * Delete, even *Download the answers* — for the one to three minutes an
   * Anthropic call takes. None of those becomes unsafe because an analysis is
   * running, and a sheet that freezes whole is a sheet somebody assumes has
   * crashed.
   */
  const [genPending, startGen] = useTransition();

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
    startGen(async () => {
      setError(null);
      const result = await reanalyse(p.id, only ?? undefined);
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      /* A close with nobody to read comes back ok with a warning and no
         analysis — there is nothing to open, so say it rather than opening an
         empty sheet. */
      setPicking(false);
      if (result.warning) {
        onActed(result.warning);
        return;
      }
      onOpenInsights();
    });

  /** How many answers the next run will read — everyone unless a subset is ticked. */
  const chosen = only === null ? p.people.length : only.length;

  /**
   * Like `run`, but the sheet stays where it is.
   *
   * `run` ends by closing the project — right for archiving, deleting and
   * closing collection, all of which finish with the project. Changing a date
   * or reopening is not one of those: it is an edit made *while* reading a
   * project, and closing the sheet under somebody who has just moved a date is
   * the app deciding they are done when they are not.
   */
  const runStay = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
    /* Only on success. Reopening leaves the field showing the date somebody
       chose, and a failure that reset it would take their answer away along
       with the error explaining it. */
    after?: () => void,
  ) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      after?.();
      onToast(message);
    });

  /**
   * The collection state as one clause, for the bar's second line.
   *
   * **The date and nothing else, and that is a width decision.** It shares a
   * line with the package inside a title that is already truncating a client's
   * name, and on a 390px phone that line is 170px. "Design · Closed 21 Aug"
   * measures 138 and fits; add who closed it and it is 220, so the name a
   * colleague left on the record would be the half that ellipsised away.
   */
  const collectionSay = shut
    ? `Closed ${p.closedOn ?? p.dueOn}`
    : p.dueOn
      ? `Open until ${p.dueOn}`
      : 'Open for answers';

  /**
   * Which of the two closed it — the half that would not fit above.
   *
   * Rule 2's distinction is real and worth keeping visible: a person leaves a
   * name in `closed_by`, and a date leaves nothing. It hangs under *Reopen
   * collection* in the menu, which is where somebody asking "who shut this?"
   * is already looking, and it costs no width on a line that is read at a
   * glance a hundred times more often than that question is asked.
   */
  const closedBy = p.closedOn
    ? p.closedByName
      ? `Closed by ${p.closedByName}`
      : 'Closed by hand'
    : 'Closed on its date';

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
      {/* `shut`, not `closed_at`: the panel says whether the link takes
          answers, and a survey past its date does not. It was reporting Open on
          a link that had been turning clients away for a week — on the one
          control the team uses to send it again. */}
      {link && p.token && <ShareLink token={p.token} url={link} closed={shut} />}
      {/* Closing the menu forgets which confirmation was open. It is held on
          the sheet rather than in the menu, so without this a person who opened
          Delete, thought better of it and clicked away found it still expanded —
          and a red panel waiting behind a button they pressed for something
          else. */}
      <MoreMenu
        /**
         * Floated free of the sheet — 21 August 2026, reported.
         *
         * `.sheet` hides its overflow so its corners stay round, and an
         * absolutely-positioned menu inside its toolbar is cut off by it. Four
         * rows always fitted; a month does not. On a project with no answers
         * the sheet is 331px and the calendar is 373, so the last row of days
         * and both buttons were simply gone.
         *
         * The width is passed because right-aligned placement subtracts it from
         * the button's edge — 316 while the calendar is up, matching the CSS
         * that widens the panel for it, and the menu's own 240 otherwise.
         */
        anchoredWidth={confirming === 'due' || confirming === 'reopen' ? 316 : 240}
        onClose={() => {
          setConfirming(null);
          setTyped('');
        }}
      >
        {(close) =>
          /**
           * While a date is being chosen, the menu *is* the calendar — 20
           * August 2026.
           *
           * Archive and Delete open in place with their rows still around them,
           * and that is right: what they add is one line and two buttons. A
           * month is 330px, and the panel with everything else still in it came
           * to 545 — taller than the sheet it hangs inside, which has
           * `overflow: hidden` for its own corners, so *Delete project* was
           * simply cut off the bottom. Scrolling a calendar is worse than not
           * showing one.
           *
           * It is also the same rule the Collection bar follows: show the
           * controls, or ask one question, never both. Cancel puts the rows
           * back.
           */
          confirming === 'due' || confirming === 'reopen' ? (
                <div className="delconfirm datepick">
                  <p>
                    {confirming === 'reopen'
                      ? picked
                        ? `Reopen until ${niceDay(picked)}?`
                        : 'Reopen until when?'
                      : picked
                        ? `Change to ${niceDay(picked)}?`
                        : 'Change to when?'}
                  </p>
                  {confirming === 'due' && picked && picked < today ? (
                    <p className="why">It has passed — the link stops at once.</p>
                  ) : null}
                  <Calendar
                    value={picked}
                    min={confirming === 'reopen' ? today : undefined}
                    onPick={setPicked}
                    label={confirming === 'reopen' ? 'Reopen until' : 'New due date'}
                  />
                  <div className="iacts">
                    <button
                      className="btn btn-ink"
                      disabled={pending || !picked}
                      onClick={() => {
                        /* Both read before the menu closes — `confirming` is
                           what chooses the action, and clearing it is the next
                           thing that happens. */
                        const day = picked;
                        const act = confirming;
                        close();
                        /* `setConfirming(null)` because the sheet is *not*
                           unmounting. Archive gets away without it — `run`
                           takes the whole sheet with it — but leave it out here
                           and the next press of the menu opens on a calendar
                           nobody asked for. */
                        setConfirming(null);
                        /* `runStay`, not `run`: both of these are edits made
                           *while* reading a project rather than ways of
                           finishing with it, so the sheet stays open. The bar
                           behind it still tells the truth — it renders
                           `p.dueOn`, the action revalidates `/`, and the sheet
                           reads its project out of that list. That is what lets
                           the date on the bar be a fact instead of a field. */
                        if (act === 'reopen') {
                          runStay(
                            () => reopenCollection(p.id, day),
                            `Reopened until ${niceDay(day)}.`,
                          );
                        } else {
                          runStay(() => setDueDate(p.id, day), `Date changed to ${niceDay(day)}.`);
                        }
                      }}
                    >
                      {pending
                        ? confirming === 'reopen'
                          ? 'Reopening…'
                          : 'Saving…'
                        : confirming === 'reopen'
                          ? 'Reopen'
                          : 'Save'}
                    </button>
                    <button className="btn btn-outline" onClick={() => setConfirming(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
          ) : (
          <>
            {/**
             * Download, back inside More — 19 August 2026, asked for.
             *
             * It had its own disc beside this one for a day, on the argument
             * that taking a copy of the answers is a thing you do to *read*
             * something while everything in here changes the project. True, and
             * it cost a third disc in a four-disc bar for an action nobody
             * takes twice on the same project.
             *
             * **Two levels, from 19 August 2026, asked for.** It was two flat
             * items — `Download as Markdown`, `Download as PDF` — which put the
             * format on the same rung as *Archive project*, and made a menu of
             * four items where the first two were one decision said twice. The
             * act is one thing and the format is a detail of it, so the act is
             * the row and the formats open under it.
             *
             * It opens **in place, exactly as Archive does** — not a dropdown,
             * asked for. A menu that opens a menu is the thing the disc beside
             * it was already doing wrong, and this menu has its own grammar for
             * a row that unfolds: a line of fact, then the answers to it, with
             * `onClose` already forgetting which row was open. Download is that
             * shape without a decision to back out of.
             *
             * **No rule under it.** There was one for a few minutes, grouping
             * reading above it and deciding below — and it put 11px between
             * this row and Archive where Archive and Delete sit flush. Four
             * rows in one menu do not need a divider to be read as two kinds of
             * thing; an uneven column is a defect in a way a missing grouping
             * is not.
             */}
            {p.answers > 0 && (
              <>
                {confirming === 'download' ? (
                  /* The archive panel's shape exactly: a line saying what you
                     get, and the answers to it underneath. Two ink pills rather
                     than one and a Cancel, because unlike archiving there is no
                     decision to back out of — these are two forms of the same
                     harmless act, and clicking away closes the menu. */
                  <div className="delconfirm">
                    {/* The way back to the menu, which Archive and Delete do not
                        need: those two answer their own question — Cancel is the
                        second half of the decision — and this row has no
                        question, only two formats and no way to change your mind
                        about opening it. Small, leading, and beside the line
                        rather than above it: 240px of menu has no room for a
                        control on its own row. */}
                    <div className="stepbackrow">
                      <button
                        className="stepback"
                        aria-label="Back to the menu"
                        onClick={() => setConfirming(null)}
                      >
                        <PrevMark />
                      </button>
                      <p>
                        All {p.answers} answer{p.answers === 1 ? '' : 's'} in one file.
                      </p>
                    </div>
                    <div className="iacts">
                      <button
                        className="btn btn-ink"
                        disabled={pending}
                        onClick={() => {
                          close();
                          exportAll('md');
                        }}
                      >
                        Markdown
                      </button>
                      <button
                        className="btn btn-ink"
                        disabled={pending}
                        onClick={() => {
                          close();
                          exportAll('pdf');
                        }}
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                ) : (
                  <button disabled={pending} onClick={() => setConfirming('download')}>
                    <SaveMark />
                    <span>Download all responses</span>
                  </button>
                )}
              </>
            )}
            {/**
             * Closing, back in this menu — 20 August 2026, asked for.
             *
             * **It left on 18 August, and the reason it left was sound.** It sat
             * on the Collection bar with the date because the date is the other
             * control over whether the link takes answers, and the two belonged
             * together. What that reasoning missed is that they are not the same
             * *kind* of thing: the date is a value somebody edits and saves, and
             * closing is one of rule 2's two human gates. Standing them shoulder
             * to shoulder made the date look like the button's argument, which
             * is what the bar was rebuilt this morning to undo.
             *
             * Here it is with the other gate. Archive is a press with a
             * consequence and a confirmation, and so is this; they read as one
             * class of act because they are one. It confirms in place exactly as
             * Archive does, so the menu never hands the question to a surface
             * behind it.
             *
             * Reopening followed it the same day, and the date after that. This
             * is now the only one of the three that needs no calendar: closing
             * is *now*, and rule 1 moves `due_at` to the moment it happens.
             */}
            {/**
             * The date, and the two acts that set it — 20 August 2026, asked
             * for.
             *
             * Both open a calendar in the row that asked for it, and they are
             * the same panel with three things swapped: the sentence over it,
             * the earliest day it will accept, and what the button does.
             *
             * - **Change due date** takes any day, including one already gone.
             *   A live survey's date can legitimately be moved backwards —
             *   `setDueDate` accepts it and the link stops at once — so the
             *   calendar refuses nothing and the sentence says what a past day
             *   would mean.
             * - **Reopen collection** will not take a day that has passed. Rule
             *   1: closing moves `due_at` to the moment it closed, so every shut
             *   survey is past its own date and reopening without a new one
             *   produces a survey that says open and turns every client away.
             *   The server refuses it; here the calendar greys it out, which is
             *   the same rule said before the press rather than after.
             *
             * **A calendar and not the three-box field.** The field is right on
             * the New survey sheet, where a date is *entered* among other fields
             * and typing beats pointing. This is neither: it is a date being
             * moved, twice in a survey's life, by somebody who is thinking in
             * weeks — *give them another week* is a place on a grid, not a
             * number they know. It also cannot be half-typed, which is what the
             * field's whole `commit` dance exists to survive.
             *
             * No answer-count guard on reopening, unlike closing: a survey
             * nobody answered is the one most likely to have run past its date,
             * and exactly the one somebody needs to reopen.
             */}
            {shut && p.surveyId ? (
              <button
                onClick={() => {
                  setPicked(defaultDueDay());
                  setConfirming('reopen');
                }}
              >
                <UndoMark />
                <span>
                  Reopen collection
                  <small>{closedBy}</small>
                </span>
              </button>
            ) : p.surveyId ? (
              <button
                onClick={() => {
                  setPicked(p.dueDay ?? '');
                  setConfirming('due');
                }}
              >
                <CalendarMark />
                <span>Change due date</span>
              </button>
            ) : null}

            {!shut && p.surveyId ? (
              confirming === 'close' ? (
                <div className="delconfirm">
                  {/* Four words of consequence, and they differ:
                      `closeCollection` runs the analysis on the way out, unless
                      there is nothing to read — then it returns a warning and
                      writes none. Promising an analysis and delivering a warning
                      is how a person learns to stop reading the line. */}
                  <p>
                    {pending
                      ? `Reading ${p.answers} ${p.answers === 1 ? 'answer' : 'answers'}. This usually takes a minute or two.`
                      : p.answers > 0
                        ? 'The analysis runs.'
                        : 'Nothing to analyse yet.'}
                  </p>
                  {/* Said out loud, the way the insights panel says it — the
                      line above does not take focus, so a screen reader got
                      silence for the length of the call. */}
                  <p className="visually-hidden" role="status">
                    {pending ? 'Closing collection and reading the answers.' : ''}
                  </p>
                  <div className="iacts">
                    <button
                      className="btn btn-ink"
                      disabled={pending}
                      onClick={() => {
                        /**
                         * The menu stays open until this finishes — 21 August
                         * 2026, and it is the whole point of the change.
                         *
                         * It used to `close()` first, which unmounted the only
                         * thing on screen that says anything is happening.
                         * `closeCollection` runs the analysis inline: measured
                         * at **93 seconds on a two-answer survey**, and the
                         * ceiling for the request is 300. For all of that the
                         * sheet sat looking idle with *Generate insights* still
                         * live beside it, so the honest reading of the screen
                         * was "nothing happened, press something else" — on the
                         * one action here that spends money.
                         *
                         * Leaving the menu up costs nothing: `pending` already
                         * disables every row in it, the label already says
                         * "Closing…", and `onActed` takes the whole sheet away
                         * on success. The insights panel has said this for two
                         * days; this is the same run and now says the same
                         * thing.
                         */
                        run(() => closeCollection(p.surveyId!), 'Collection closed.');
                      }}
                    >
                      {pending ? 'Closing…' : 'Close now'}
                    </button>
                    <button
                      className="btn btn-outline"
                      disabled={pending}
                      onClick={() => setConfirming(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirming('close')}>
                  <LockMark />
                  <span>Close collection</span>
                </button>
              )
            ) : null}

            {confirming === 'archive' ? (
              /* One line, then the two answers to it. The sentence used to sit
                 *between* the buttons, which put the reason for the decision
                 after one of the ways of making it. */
              <div className="delconfirm">
                <p>Nothing is deleted — it stays searchable.</p>
                <div className="iacts">
                  <button
                    className="btn btn-ink"
                    disabled={pending}
                    onClick={() => {
                      close();
                      run(() => archiveProject(p.id), `${p.clientName} archived.`);
                    }}
                  >
                    {pending ? 'Archiving…' : 'Archive'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                </div>
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
                <div className="iacts">
                  <button
                    className="btn btn-danger"
                    /* unavailable until the name is right, rather than failing
                       after the press */
                    disabled={pending || !matches}
                    onClick={() => {
                      close();
                      run(() => deleteProject(p.id, typed), `${p.clientName} deleted.`);
                    }}
                  >
                    {pending ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setConfirming(null);
                      setTyped('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="danger" onClick={() => setConfirming('delete')}>
                <TrashMark />
                <span>Delete project</span>
              </button>
            )}
          </>
          )
        }
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
          {/**
           * The package, and whether anybody can still answer — 20 August 2026,
           * asked for.
           *
           * The collection state had a section of its own: a bordered card
           * holding two lines of text and, until this morning, a date field and
           * a button. The controls left for the More menu one at a time, and
           * what was under them turned out to be a fact — *open until the
           * second, or closed on the twentieth* — sitting in a card sized for
           * something you could press.
           *
           * A fact about the project belongs on the line that already carries
           * one. This is the same slot as the package, and it is the bar rather
           * than the body, which matters here: the bar is sticky, so *can
           * anybody still answer* stays on screen while somebody scrolls
           * through the answers. In a card it scrolled away.
           *
           * **Who closed it survives, and the wording is what carries rule 2's
           * distinction.** A person leaves a name in `closed_by`; a date leaves
           * nothing. So it is "by Nan" or "on its date", never a bare "closed"
           * that hides which of the two happened. The sentence that used to
           * follow — that nobody can answer until you reopen it — is gone: it
           * explained the word *closed*, and the way back is a menu row.
           */}
          <i>
            {p.packageLabel}
            {p.token ? ` · ${collectionSay}` : ''}
          </i>
        </>
      }
      actions={actions}
      /* This sheet carries its own ground — it is nearly all cards, and the
         parchment between them stopped reading as a page. See `.sheet.paper`,
         which the insights sheet takes as well. */
      surface="paper"
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
      {/* No heading over it, the way Collection has none. The panel names itself
          on its own first line — see the eyebrow below. */}
      <div className="pd-sec pd-insights">
        <div className="insbox">

        {/**
         * The *needs your team* banner, folded in — 18 August 2026, asked for.
         *
         * It was a card of its own two sections up, saying what was going on and
         * nothing about it: its button had already gone, because all three of
         * the things it prompted for are what this section does. Closing
         * collection is this section's own Generate; writing the insights after
         * a failure is a re-run; reviewing them is *Open the insights*. A prompt
         * that far from the only control answering it is two places to read
         * before pressing one button.
         *
         * The accent label comes with it and keeps its rule: it appears only
         * when a person is actually needed (DESIGN.md §1). With nothing
         * outstanding the section states where the analysis stands and stays
         * quiet, which is what the card's own *WAITING* was for.
         *
         * `say`/`emphasis`/`when` are used when there is an action because they
         * are situational and richer — *the date you asked for has passed*, and
         * the date it is reckoned from. The plain line underneath is the resting
         * state, and the two never both appear.
         */}
          <div className="inshead">
            {/**
             * The panel names itself, then says what it is for.
             *
             * It opened with an eyebrow — the Point and NEEDS YOUR TEAM when
             * something was outstanding, the word *Insights* when it was not —
             * over a sentence reporting the state. Both went on 20 August 2026,
             * asked for. The eyebrow's job was to make this panel the loud thing
             * on the sheet when a person was needed, and the panel is now the
             * loud thing on the sheet at all times: it is the only surface in
             * the app carrying a gradient, and an accent label inside an accent
             * banner is the same signal twice.
             *
             * **"AI insights", and the noun is doing the work.** PRODUCT.md's
             * anti-references forbid the interface implying its own output
             * decides anything — no "recommended", no "AI suggests", no
             * "smart". Naming the mechanism is not that: the page *is* written
             * by Claude, and a team that knows which of their surfaces is
             * machine-written reads it with the right amount of suspicion. What
             * the rule bars is the next sentence claiming authority, which is
             * why the one below reports rather than concludes.
             */}
            <h3 className="institle">AI insights</h3>
            <p className="inslede">
              What your client has settled, where they differ, and what is still open.
            </p>

            {/**
             * The provenance line went on 20 August 2026, asked for — "Written
             * 19 Aug · 3 runs kept", and the action's `when` in its other arm.
             *
             * *Read insights* opens the newest run, which is what somebody
             * pressing it wants; the date it was written, the number of runs
             * kept and the version list are all one press further in, on the
             * sheet that shows them. This panel says what the insights are and
             * offers the two acts, and it stops there.
             *
             * **What went with it, and is worth knowing:** the clause warning
             * that the newest run had been overtaken — "read 3 of the 5 answers
             * now in" — lived in the same paragraph. It is a real fact and it is
             * now unsaid here. The insights sheet still records whose answers
             * each version read, so it is not lost, only moved further away.
             */}

            {/* The way in moved down beside Generate on 20 August 2026, asked
                for: where there is an analysis the panel offers two acts, and
                two acts belong in one row. It keeps the accent — it is what
                somebody opened this sheet for — and Generate steps back to an
                outline behind it, so exactly one primary is on the panel. */}
          </div>

          {/**
           * The machine's half of the panel, on the recessed ground.
           *
           * Above the line is what has happened; below it is what it will read
           * and the control that makes it read. Two bands rather than five loose
           * paragraphs under a heading — the section had no object at all, which
           * is what let a prompt, a provenance line and a split button sit at
           * the same level as though they were a list.
           */}
          <div className="insfoot">
        {!p.people.length ? (
          /**
           * Nothing to read — and the control says so by being there.
           *
           * This was a sentence alone. A person scanning the panel for the
           * thing to press found nothing at all, and an absent button is
           * indistinguishable from a button that has not loaded. Disabled, it
           * reports the state in the same place the state will be resolved:
           * the shape of what will happen is already on screen, greyed, waiting
           * for the one thing that is missing.
           *
           * No chevron on it either. There is nobody to choose between.
           */
          <div className="insempty">
            <div className="iacts">
              <button className="btn btn-primary" disabled>
                Generate insights
              </button>
            </div>
            {/* Four words under the control rather than a sentence above it.
                It read "Nobody has answered yet. The analysis reads the answers,
                so it has nothing to read" — two clauses explaining a mechanism,
                stacked over a second sentence that already explains the panel,
                to say the one thing the greyed-out button says by being greyed
                out. What is left is the reason, in the place a caption goes. */}
            <p className="insnote">{p.token ? 'No answers yet.' : 'No link issued yet.'}</p>
          </div>
        ) : (
          <>

            {/**
             * One control, not two — asked for 18 August 2026.
             *
             * It was a filled *Generate insights* beside a quiet *Select
             * responses*, which is two buttons for one act: the second does not
             * generate anything, it changes what the first will read. As a split
             * button that relationship is the shape — press the wide half to run
             * it, press the chevron to say what it runs on, and the wide half's
             * label reports the answer either way.
             *
             * Everyone is ticked when it opens. The dropdown is a refinement of
             * a default, not a question standing between the team and the thing
             * they came to press.
             *
             * A single respondent gets no chevron: choosing between one person
             * and nobody is not a choice.
             */}
            {p.answers === 0 ? (
              /**
               * The only thing that still stops a run: nothing to read.
               *
               * It used to be an open survey. That went on 19 August 2026 —
               * the team asked to read two or three answers before deciding
               * whether to chase the rest, and nothing about the analysis
               * needed the survey shut. See `reanalyse`.
               *
               * Closing still runs it on the way, so the ordinary path is
               * unchanged; this is the early read, taken deliberately.
               */
              <p className="ireads">
                Nothing to read yet. The analysis runs on the answers that are in — one is
                enough — and every run is kept, so an early read costs nothing.
              </p>
            ) : (
              <>
                {/**
                 * What it reads, as one mark per answer.
                 *
                 * **This is the only place in the app that looks like a machine
                 * is doing something, and it is a count rather than an effect.**
                 * One tick per person who answered: ink for the ones this run
                 * will read, hairline for the ones it will not, so unticking
                 * somebody in the menu empties a mark here and the sentence
                 * beside it is not the only evidence of the choice.
                 *
                 * While it runs the ticks pass a wave left to right, which is
                 * the honest shape of what is happening — it is reading them,
                 * one after another. No sparkle and no shimmer: the wave is
                 * opacity on marks that were already there, so there is nothing
                 * on screen that exists only to say *AI*.
                 *
                 * Ink and not the accent, though these marks do report a
                 * choice. The accent is spoken for on this panel by Generate,
                 * and DESIGN.md's ladder says nothing may take a rung above its
                 * importance — what the analysis reads is a fact about the run,
                 * and the run is the thing being urged.
                 *
                 * Rules 3 and 7 are safe: these are the people who actually
                 * answered, never a fraction of an expected number and never a
                 * proportion of anything.
                 */}
                {/**
                 * What this run will read, in a sentence — 20 August 2026.
                 *
                 * The tally beside it went: one tick per person who answered,
                 * ink for the ones being read and hairline for the rest, with a
                 * wave passing left to right while the analysis ran. It was the
                 * only thing in the app that looked like a machine working, and
                 * it was carrying a fact the sentence beside it already states
                 * in words — how many, and by subtraction whose.
                 *
                 * The sentence is the accessible version and always was: the
                 * marks needed a `role="img"` and a label listing who was being
                 * left out, which is the sentence again in a second place. One
                 * place now.
                 *
                 * Rules 3 and 7 stay safe either way — this counts the people
                 * who actually answered, never a fraction of an expected number.
                 */}
                {/**
                 * Only while it is running — 20 August 2026, asked for.
                 *
                 * At rest this said "Reads all 5 answers. Every run is kept as
                 * a version, so this replaces nothing." Both halves were
                 * answering questions nobody had asked yet: how many it will
                 * read is the button's own label the moment the default is
                 * changed, and *nothing will be lost* is a reassurance offered
                 * to somebody who has not yet decided to press anything.
                 *
                 * During the run it is the only thing on the panel that says
                 * how long this takes, and the run is two minutes. The button
                 * beside it reads "Reading…" and nothing else would say why.
                 */}
                {genPending && (
                  <div className="insreads">
                    <p className="ireads">
                      Reading {chosen} {chosen === 1 ? 'answer' : 'answers'}. This usually takes a
                      minute or two.
                    </p>
                  </div>
                )}

                {/* Said out loud. The sentence above does not take focus, so a
                    screen reader got silence for the length of the call. */}
                <p className="visually-hidden" role="status">
                  {genPending ? `Reading ${chosen} answers. This usually takes a minute or two.` : ''}
                </p>

                <div className="iacts">
                  {/* Two acts, one row — asked for 20 August 2026. Read first:
                      it is what somebody opened the sheet for, and it is the
                      cheap one. Generate is beside it and costs money and
                      minutes, which is why the accent sits on the left. */}
                  {p.insights && (
                    <button
                      className="btn btn-primary"
                      disabled={genPending}
                      onClick={onOpenInsights}
                    >
                      Read insights
                    </button>
                  )}
                  {/**
                   * Filled only when there is nothing to open.
                   *
                   * `Generate again` was the accent pill and *Open the insights*
                   * the outline beside it, which points the scarcest signal in
                   * the system at the expensive, rare act. For a project that
                   * already has an analysis the overwhelming intent is to read
                   * it; re-running costs money and minutes. PRODUCT.md's
                   * fifteen-second reader presses the biggest orange thing, and
                   * it was the one thing they should almost never press.
                   *
                   * So the accent goes to the first run and to a failed one, and
                   * steps back to an outline once there is something to open.
                   * Exactly one primary stays visible either way — the floor's
                   * item 6 — and it is the one somebody came for.
                   */}
                  <div className="splitwrap" ref={split}>
                    <div className="split" data-open={picking || undefined}>
                      <button
                        className={`btn ${p.insights && !error ? 'btn-outline' : 'btn-primary'}`}
                        disabled={genPending || chosen === 0}
                        onClick={generate}
                      >
                        {/**
                         * It says Generate — 20 August 2026, asked for.
                         *
                         * It used to become "Generate from 3" the moment a name
                         * was unticked, which put the state of the *picker* on
                         * the face of the button that runs it: the label moved
                         * because of something you did in a panel that is no
                         * longer open, and the one control on the sheet that
                         * should be a constant became the one that moved most.
                         * Whose answers a run reads is the picker's business
                         * and the picker shows it, in ticks.
                         *
                         * What is left varies by what the panel *is*, not by
                         * what is selected in it: the full name when it is the
                         * only control on the row, the short one when it shares
                         * the row with Read, and the two operation states.
                         */}
                        {genPending
                          ? 'Reading…'
                          : error
                            ? 'Try again'
                            : p.insights
                              ? 'Generate'
                              : 'Generate insights'}
                      </button>
                      {p.people.length > 1 && (
                        <button
                          ref={pickBtn}
                          className="splitmore"
                          aria-label="Choose whose answers to read"
                          title="Choose whose answers to read"
                          /* Not `aria-haspopup` — that announces a menu, and
                             what opens is a group of checkboxes. `expanded` and
                             `controls` describe what is actually there. */
                          aria-expanded={picking}
                          aria-controls={`pick-${p.id}`}
                          disabled={genPending}
                          onClick={() => setPicking((o) => !o)}
                        >
                          <DownMark />
                        </button>
                      )}
                    </div>

                    {picking && at && (
                      <div
                        ref={pickPanel}
                        id={`pick-${p.id}`}
                        className="splitmenu"
                        role="group"
                        aria-label="Whose answers to read"
                        style={{ top: at.top, left: at.left, width: at.width }}
                      >
                        {/**
                         * Everyone and Nobody went on 20 August 2026, asked
                         * for, and the panel opens with everybody ticked.
                         *
                         * They were a shortcut for a list this product does not
                         * have: PRODUCT.md records that one person usually
                         * answers and three to twenty is the whole range, so
                         * *unticking nineteen of twenty* was the case they were
                         * built for and it is not a case that occurs. Against
                         * two names they were two more controls than the job
                         * needed, and the pair spent the accent — a chosen
                         * segment in orange — on saying that the default was
                         * still the default.
                         *
                         * Everyone remains the default, which is what `only ===
                         * null` has always meant. Nobody is still reachable by
                         * unticking the names, and still refuses to run: the
                         * warning below is what says so.
                         */}
                        {p.people.map((person) => {
                          const on = only === null || only.includes(person.id);
                          return (
                            <label key={person.id} className="pickwho">
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={genPending}
                                onChange={() => {
                                  const base = only ?? p.people.map((x) => x.id);
                                  const next = on
                                    ? base.filter((id) => id !== person.id)
                                    : [...base, person.id];
                                  /* everyone ticked is the same as no selection —
                                     keep it null so the run records it that way */
                                  setOnly(next.length === p.people.length ? null : next);
                                }}
                              />
                              <span>{person.name}</span>
                            </label>
                          );
                        })}
                        {chosen === 0 && (
                          <p className="hintline warn">Tick at least one person.</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/**
                 * The run that failed, where the person who ran it is looking.
                 *
                 * It rendered as the last child of the whole sheet, below the
                 * fold, with no role. Somebody who waited ninety seconds
                 * watching this panel saw the button return to rest and nothing
                 * else — and the likeliest next move is pressing it again,
                 * which is a second paid call for a failure the first one had
                 * already diagnosed. `role="alert"` so it is also said out
                 * loud, and the button above now reads *Try again*.
                 */}
                {error && (
                  <p className="insfail" role="alert">
                    <b>That run did not finish.</b> {error}
                  </p>
                )}
              </>
            )}
          </>
        )}
          </div>
        </div>
      </div>

      {error && <p className="formerror">{error}</p>}

      {/* Gate 3 — archive — is in the toolbar's More menu, with the sentence
          this section existed to say attached to it: nothing is deleted. Only
          your team can do it, and the app never archives anything by itself. */}
    </Sheet>
  );
}
