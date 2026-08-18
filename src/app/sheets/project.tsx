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
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');
  /* trimmed and case-insensitive, matching the action — a guard against acting
     without meaning to, not a spelling test, and the names are often Thai where
     a trailing space is invisible */
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
   * default and nearly always what happens — the subset exists to see the insights
   * without an outlier or a duplicate, not as a routine step, so it stays out
   * of the way until somebody opens it.
   */
  const [only, setOnly] = useState<string[] | null>(null);
  const [picking, setPicking] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, message: string) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      onActed(message);
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
      <MoreMenu>
        {(close) => (
          <>
            {!p.closedOn && p.surveyId && p.answers > 0 && (
              <button
                disabled={pending}
                onClick={() => {
                  close();
                  run(() => closeCollection(p.surveyId!), 'Collection closed.');
                }}
              >
                <LockMark />
                <span>Close collection</span>
              </button>
            )}
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
            {confirmArchive ? (
              <>
                <button
                  className="danger"
                  disabled={pending}
                  onClick={() => {
                    close();
                    run(() => archiveProject(p.id), `${p.clientName} archived.`);
                  }}
                >
                  {pending ? 'Archiving…' : `Yes, archive ${p.clientName}`}
                </button>
                {/* The sentence the retired Archive section existed to say. It
                    was on the menu row and the rows are one line now, so it
                    sits at the moment the decision is made instead — which is
                    where it was always most use. */}
                <p className="menunote">Nothing is deleted — it stays searchable.</p>
                <button onClick={() => setConfirmArchive(false)}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmArchive(true)}>
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
            {confirmDelete ? (
              <div className="delconfirm">
                <p>
                  This deletes {p.answers} {p.answers === 1 ? 'answer' : 'answers'}
                  {p.insights ? ' and the insights written from them' : ''}. It cannot be undone.
                </p>
                <label htmlFor={`del-${p.id}`}>
                  Type <b>{p.clientName}</b> to confirm
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
                  /* the name has to be right before this does anything, so the
                     button says so by being unavailable rather than by failing
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
                    setConfirmDelete(false);
                    setTyped('');
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button className="danger" onClick={() => setConfirmDelete(true)}>
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
                  <span className="role">{person.email || 'no email given'}</span>
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
            {/* which answers this reads. Hidden until asked for, because the
                answer is "all of them" almost every time. Only for the two
                actions that read answers — reviewing what is already written
                reads nothing. */}
            {p.action.kind !== 'review-insights' && p.people.length > 1 && (
              <div className="whoreads">
                {picking ? (
                  <>
                    <p className="hintline">Read the answers of:</p>
                    {p.people.map((person) => {
                      const on = only === null || only.includes(person.id);
                      return (
                        <label key={person.id} className="pickwho">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              const base = only ?? p.people.map((x) => x.id);
                              const next = on
                                ? base.filter((id) => id !== person.id)
                                : [...base, person.id];
                              /* everyone selected is the same as no selection —
                                 keep it null so the insights records it that way */
                              setOnly(next.length === p.people.length ? null : next);
                            }}
                          />
                          <span>{person.name}</span>
                        </label>
                      );
                    })}
                  </>
                ) : (
                  <button className="linky" onClick={() => setPicking(true)}>
                    {only
                      ? `Reading ${only.length} of ${p.people.length} answers — change`
                      : 'Choose whose answers to read'}
                  </button>
                )}
              </div>
            )}
            {/**
             * Three actions reach this card and they are not the same act.
             * Closing collection is the gate; writing the insights is the
             * retry after the analysis failed on a survey already closed;
             * reviewing opens the sheet and touches nothing.
             *
             * All three used to call `closeCollection`, so two of them came
             * back "That survey is already closed." — the label said one thing
             * and the button did another. Branch on the kind.
             */}
            <button
              className="btn btn-primary"
              disabled={pending || only?.length === 0}
              onClick={() => {
                if (p.action!.kind === 'review-insights') return onOpenInsights();
                if (p.action!.kind === 'write-insights') {
                  return run(() => reanalyse(p.id, only ?? undefined), 'The insights are written.');
                }
                run(
                  () => closeCollection(p.surveyId!, only ?? undefined),
                  'Collection closed.',
                );
              }}
            >
              {pending ? 'Working…' : p.action.label}
            </button>
            {p.action.kind === 'close-collection' && (
              <p className="hintline">
                This records that you closed it, and when. Closing stops new answers and starts the
                analysis.
              </p>
            )}
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
      {p.token && (
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
          {/* Reopening is in the toolbar's More menu. A stakeholder replying the
              day after collection closed is not an edge case, and reopening
              leaves the insights alone: what they say was true of the answers
              they were written from, and they keep saying so. */}
        </div>
      )}

      {/* documents */}
      <div className="pd-sec">
        <h2>Documents</h2>
        {p.insights ? (
          <div className="pd-docs">
            <button className="doc" onClick={onOpenInsights}>
              Survey analysis
              <small>
                {p.answers} {p.answers === 1 ? 'answer' : 'answers'}
                {p.insightsWrittenOn ? ` · ${p.insightsWrittenOn}` : ''}
              </small>
            </button>
          </div>
        ) : (
          <p className="quiet">
            {p.closedOn
              ? 'Collection is closed but no insights were written. Needs you has a button to write it.'
              : 'Nothing produced yet — documents appear here as the project moves.'}
          </p>
        )}
      </div>

      {error && <p className="formerror">{error}</p>}

      {/* Gate 3 — archive — is in the toolbar's More menu, with the sentence
          this section existed to say attached to it: nothing is deleted. Only
          your team can do it, and the app never archives anything by itself. */}
    </Sheet>
  );
}
