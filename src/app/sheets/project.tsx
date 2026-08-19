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
  DocMark,
  DownMark,
  PrintMark,
  SaveMark,
  TrashMark,
  UndoMark,
} from '../icons';
import { submitted } from '@/lib/team/when';
import { useAnchored, useDismiss } from '../anchored';
import DateField from '../date-field';
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

  /** Whether the subset dropdown is open. Shut is the ordinary case: read everyone. */
  const [picking, setPicking] = useState(false);
  const split = useRef<HTMLDivElement>(null);
  /* Roughly the dropdown's own size; it only decides whether to open down or
     up, and a list of three or four names is short either way. */
  const at = useAnchored(picking, split, 260, 200);
  useDismiss(picking, split, useCallback(() => setPicking(false), []));

  /* The date field is controlled now, so the sheet holds it. It was
     `defaultValue` on a native input, which the browser kept for us. */
  const [due, setDue] = useState(p.dueDay ?? '');
  /**
   * Whether the field is showing something other than what is saved.
   *
   * This is the whole state the confirmation needs — no second copy of the date
   * waiting to be committed, and nothing to reset on cancel except the field
   * itself. `p.dueDay` is the truth; `due` is what somebody has typed.
   */
  const dueChanged = due !== (p.dueDay ?? '');
  const today = dayIn(new Date());
  /**
   * The date the client was told has gone by, and the link is refusing them.
   *
   * `p.dueDay` and not `due` — the saved date, not the one somebody is halfway
   * through typing. Typing tomorrow's date into a shut survey should not
   * announce that it is open again before anybody has pressed Save.
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

  /**
   * Reopening, once somebody has asked to.
   *
   * It needs a date — closing moves `due_at` to the moment it closed, so every
   * shut survey is past its date and clearing the gate alone would produce one
   * that says open and refuses everybody. So the bar's date goes from a fact
   * you are reading to a field you are filling, and the confirmation asks with
   * the date in it.
   */
  const [reopening, setReopening] = useState(false);

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
            {/* Closing and reopening left this menu on 18 August 2026 — they
                are in the Collection section with the date, which is the other
                control over whether the link is taking answers. What is left
                here is the pair that finish with a project rather than govern
                it. */}
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
                  <button className="btn btn-quiet" onClick={() => setConfirming(null)}>
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
                    className="btn btn-quiet"
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

      {/**
       * The date, and no longer the link.
       *
       * "The link" headed this section with the URL in a box beneath it, and
       * both are in the share panel on the toolbar now — the link and the way
       * to send it belong to one control, and this section is about *when* the
       * answers are wanted rather than where they go.
       */}
      {/**
       * Collection — everything that decides whether the link takes answers.
       *
       * The date and closing were in two places: a section of its own for the
       * date, and a row in the toolbar's More menu for the close. They govern
       * the same thing and they had drifted apart, which was easy to miss while
       * the date closed nothing. It shuts the link now, so the two are a soft
       * shutter and a hard one and they belong side by side — you set a date to
       * stop answers *later*, and you close to stop them *now*.
       *
       * The difference is worth keeping visible, and the section keeps it: the
       * date writes nothing and moving it forward undoes it, while closing is
       * gate 1, puts a name on the record and runs the analysis. So they are two
       * controls in one section rather than one control with a switch.
       *
       * Reopening came with the close, being its inverse.
       */}
      {p.token && (
        <div className="pd-sec">
          <h2>Collection</h2>

          {/**
           * One bar, both states — the reference the team brought in, and the
           * meaning they confirmed on 19 August 2026.
           *
           * **Closed means no answer is accepted, and there are two ways in:**
           * somebody presses Close now, or the date arrives. The client meets
           * the same screen either way, so the bar says the same word either
           * way. It used to call one of them closed and merely describe the
           * other, which left a survey that had been refusing people for a week
           * reading as *open* — with the analysis, a few inches below, telling
           * the team to close it first.
           *
           * So there is one object with two faces rather than two blocks with a
           * ternary between them:
           *
           * - **Open** — the calendar disc, the date as the reference's counter,
           *   and Close now filled. The date is the soft shutter and the button
           *   the hard one, and both land in the same place.
           * - **Closed** — the lock disc, the date it stopped shown and not
           *   editable, and Reopen filled. Pressing Reopen hands the field back
           *   and asks for a date, because there is no reopening without one.
           *
           * The date is on the bar in both, which is the point of it: *when did
           * this stop, or when will it*, is the same question either side of the
           * moment it stops.
           */}
          <div className="collbox">
            <div className="collbanner">
              <span className="colltext">
                <b>{shut ? `Closed ${p.closedOn ?? p.dueOn}` : 'Open for answers'}</b>
                <span>
                  {/* Which of the two closed it, and it is worth a line. A
                      person leaves a name in `closed_by` and a date leaves
                      nothing — rule 2's whole distinction, said in the one
                      place somebody reads it. */}
                  {!shut
                    ? 'The client sees this date. After it, the link stops taking answers.'
                    : p.closedOn
                      ? `${p.closedByName ? `by ${p.closedByName}. ` : ''}Nobody can answer until you reopen it.`
                      : 'The date arrived. Nobody can answer until you reopen it.'}
                </span>
              </span>

              {/* The bold line is the state, not a field label, so the date
                  group's name is said and not drawn — the reference does not
                  label its counter either. A span and not a `<label for>`:
                  the control is three boxes and `for` binds only to a form
                  control. */}
              <span className="visually-hidden" id={`due-${p.id}`}>
                {shut ? 'Answers closed on' : 'Answers close on'}
              </span>
              {/* Disabled while shut, and a fact rather than a field: the date
                  is the day it stopped, and typing over it would be editing
                  history. Reopen is what makes it a field again.

                  No `min` when it is one — a live project's date can
                  legitimately be moved to one already past, and `setDueDate`
                  accepts it. Typing moves the field and nothing else: the date
                  shuts a client's link, and a three-box control passes through
                  several legal dates on the way to the one somebody means. */}
              <DateField
                labelledBy={`due-${p.id}`}
                value={due}
                disabled={pending || (shut && !reopening)}
                onChange={setDue}
              />

              {/**
               * Reopen, which is one control over both ways of being shut.
               *
               * It used to be two: a Reopen on the closed bar that cleared the
               * gate, and nothing at all past the date but a sentence telling
               * somebody to move it. Neither worked alone once closing began
               * moving `due_at` to the moment it closed — clearing the gate on
               * a survey whose date has passed produces one that says open and
               * refuses every client who opens the link.
               *
               * So it asks for a date, both times. This press only fills the
               * field with the fourteen days the New survey sheet prefills and
               * opens the question below; nothing is written until somebody
               * reads the date and presses Reopen again.
               *
               * No answer-count guard, unlike closing: a survey nobody answered
               * is the one most likely to have run past its date, and exactly
               * the one somebody needs to reopen.
               */}
              {shut && !reopening && p.surveyId && (
                <button
                  className="btn btn-outline collnow"
                  disabled={pending}
                  onClick={() => {
                    setReopening(true);
                    setDue(defaultDueDay());
                  }}
                >
                  Reopen
                </button>
              )}

              {/**
               * Filled, where the panel this replaces had it outlined.
               *
               * Closing is still available rather than urged — the app asks
               * through *Needs you* when it has a reason to — but on a
               * near-black bar the outline pill is the quiet form and the
               * filled one is simply the action. `.btn-ink` inverts by itself
               * here: `--ink` is the warm white and `--canvas` the charcoal, so
               * it lands as the reference's white pill without a rule of its
               * own. The lock glyph went with the reference's own bare label —
               * the row is tight and "Close now" is not ambiguous.
               *
               * It is not here once the survey is shut, and does not need to
               * be: the date closed it as firmly as the button would have, and
               * the analysis reads it either way.
               *
               * **It is here for every open survey, answered or not** — the
               * answer-count guard went on 19 August 2026. It was written when
               * closing was the only thing that produced an analysis, so a
               * survey with nothing to read had nothing to close *for*. The
               * date closes those too, and closing one by hand is the same act:
               * this is over, nobody is going to answer. Keeping the guard
               * meant a survey reopened for a straggler who never came could
               * not be shut again by the person who reopened it.
               */}
              {!shut && p.surveyId && (
                <button
                  className="btn btn-outline collnow"
                  disabled={pending}
                  onClick={() => setConfirming('close')}
                >
                  Close now
                </button>
              )}
            </div>

            {/**
             * Reopening, asked with the date in it.
             *
             * Its own row rather than the date-change one below, because it is
             * a different act with a different server call: that one moves a
             * live survey's date, this one clears the gate as well when there
             * is a gate to clear. One action does both — see
             * `reopenCollection`.
             */}
            {reopening && (
              <div className="collask">
                <p>
                  <b>{due ? `Reopen until ${niceDay(due)}?` : 'Reopen until when?'}</b>{' '}
                  <span className="why">
                    {!due
                      ? 'A reopened survey needs a date, or the link has nothing telling it to serve.'
                      : due < today
                        ? 'That date has passed, so the link would stop again straight away.'
                        : 'The link takes answers again, and stops after this date.'}
                  </span>
                </p>
                <div className="iacts">
                  <button
                    className="btn btn-ink"
                    disabled={pending || !due || due < today}
                    onClick={() =>
                      runStay(
                        () => reopenCollection(p.id, due),
                        `Reopened until ${niceDay(due)}.`,
                        () => setReopening(false),
                      )
                    }
                  >
                    {pending ? 'Reopening…' : 'Reopen'}
                  </button>
                  <button
                    className="btn btn-quiet"
                    disabled={pending}
                    onClick={() => {
                      setReopening(false);
                      setDue(p.dueDay ?? '');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {dueChanged && !reopening && (
              /* A row of its own, spanning the panel — the question is about
                 the row above it and belongs inside the same object. */
              <div className="collask">
                {/* There is no "Remove the date?" any more. Every survey has one
                    — 19 August 2026 — because a survey without a date takes
                    answers until somebody remembers to close it. An empty field
                    is somebody halfway through typing, so it says what is
                    missing and Save waits. */}
                <p>
                  <b>{due ? `Change to ${niceDay(due)}?` : 'Finish the date.'}</b>{' '}
                  <span className="why">
                    {!due
                      ? 'A survey needs a date to close on — it cannot be left empty.'
                      : due < today
                        ? 'It has already passed, so the link stops serving straight away.'
                        : 'The client sees it, and the link stops serving after it.'}
                  </span>
                </p>
                <div className="iacts">
                  <button
                    className="btn btn-ink"
                    disabled={pending || !due}
                    onClick={() =>
                      runStay(() => setDueDate(p.id, due), `Date changed to ${niceDay(due)}.`)
                    }
                  >
                    {pending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="btn btn-quiet"
                    disabled={pending}
                    onClick={() => setDue(p.dueDay ?? '')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {confirming === 'close' && (
              <div className="collask">
                {/* What actually happens, which is not the same sentence when
                    there is nothing to read: `closeCollection` returns with a
                    warning and writes no analysis. Promising one and delivering
                    a warning is how a person learns to distrust the line. */}
                <p>
                  <b>Close it now?</b>{' '}
                  <span className="why">
                    {p.answers > 0
                      ? 'The analysis is written and the link stops serving. You can reopen it afterwards.'
                      : 'The link stops serving. Nobody has answered, so there is nothing to analyse — you can reopen it afterwards.'}
                  </span>
                </p>
                <div className="iacts">
                  <button
                    className="btn btn-ink"
                    disabled={pending}
                    onClick={() => {
                      setConfirming(null);
                      run(() => closeCollection(p.surveyId!), 'Collection closed.');
                    }}
                  >
                    {pending ? 'Closing…' : 'Close'}
                  </button>
                  <button className="btn btn-quiet" onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
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
        {p.action ? (
          <>
            {/* The Point — DESIGN.md §"five named pieces" gives it three jobs and
                one of them is literally "the team app's needs you". It is the
                brand's own mark for this exact moment, so the banner wears it
                rather than inventing something to be branded with. */}
            <p className="ineed">
              <span className="pt" aria-hidden="true" />
              NEEDS YOUR TEAM
            </p>
            <p className="isay">
              <b>{p.action.say}</b> {p.action.emphasis}
            </p>
            <p className="iwhen">{p.action.when}</p>
          </>
        ) : p.insights ? (
          <p className="isay">
            <b>Written {p.insightsWrittenOn}</b>
            {p.insightsVersions.length > 1 ? ` · ${p.insightsVersions.length} versions kept` : ''}
          </p>
        ) : (
          <p className="isay">
            <b>Not written yet</b>
            {shut
              ? ` · collection closed ${p.closedOn ?? p.dueOn}${p.closedByName ? ` by ${p.closedByName}` : ''}`
              : p.answers
                ? ' · collection is open'
                : ''}
          </p>
        )}

        {!p.people.length ? (
          <p className="quiet">
            {p.token
              ? 'Nobody has answered yet. The analysis reads the answers, so it has nothing to read.'
              : 'No link has been issued for this project yet.'}
          </p>
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
            {!shut ? (
              /**
               * Generating needs a closed survey, and closing is the Collection
               * section's job now.
               *
               * `shut`, not `closed_at` — a survey past its date is closed by
               * the team's own definition, and it had been telling them to go
               * and close a link that had been refusing clients for a week.
               *
               * This button used to read *Close collection and generate* and do
               * both — which was one press instead of two, and put a second
               * control that closes a survey a few inches below the one that
               * does it deliberately. Two buttons closing the same survey is
               * how somebody closes it meaning to do the other thing.
               *
               * So it says what is missing and where, and the section above is
               * where it happens.
               */
              <p className="ireads">
                The analysis reads a closed survey. Close it above — on the date, or with{' '}
                <b>Close now</b> when you have enough answers.
              </p>
            ) : (
              <>
                <p className="ireads">
                  {chosen === p.people.length
                    ? `Reads all ${p.answers} ${p.answers === 1 ? 'answer' : 'answers'}.`
                    : `Reads ${chosen} of ${p.people.length} answers.`}{' '}
                  Every run is kept as a version, so this replaces nothing.
                </p>

                <div className="iacts">
                  <div className="splitwrap" ref={split}>
                    <div className="split" data-open={picking || undefined}>
                      <button
                        className="btn btn-primary"
                        disabled={pending || chosen === 0}
                        onClick={generate}
                      >
                        {pending
                          ? 'Working…'
                          : chosen !== p.people.length
                            ? `Generate from ${chosen} ${chosen === 1 ? 'answer' : 'answers'}`
                            : p.insights
                              ? 'Generate again'
                              : 'Generate insights'}
                      </button>
                      {p.people.length > 1 && (
                        <button
                          className="splitmore"
                          aria-label="Choose whose answers to read"
                          title="Choose whose answers to read"
                          aria-haspopup="true"
                          aria-expanded={picking}
                          disabled={pending}
                          onClick={() => setPicking((o) => !o)}
                        >
                          <DownMark />
                        </button>
                      )}
                    </div>

                    {picking && at && (
                      <div
                        className="splitmenu"
                        role="group"
                        aria-label="Whose answers to read"
                        style={{ top: at.top, left: at.left, width: at.width }}
                      >
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

                  {p.insights && (
                    <button className="btn btn-quiet" disabled={pending} onClick={onOpenInsights}>
                      Open the insights
                    </button>
                  )}
                </div>
              </>
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
