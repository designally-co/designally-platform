'use client';

import { useState, useTransition } from 'react';

import {
  archiveProject,
  closeCollection,
  reanalyse,
  reopenCollection,
  setDueDate,
} from '@/lib/team/actions';
import type { ProjectView } from '@/lib/team/projects';
import { forDisplay } from '@/lib/survey/link';
import Sheet from './sheet';

/**
 * Everything about one client. Five sections: who answered · right now ·
 * the link · documents · archive. The job ends at the summary.
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

  return (
    <Sheet title="Project" onClose={onClose}>
      <div className="pd-head">
        <h1>{p.clientName}</h1>
        <div className="pkg">
          {p.packageLabel}
          {p.projectCode ? ` · ${p.projectCode}` : ''}
        </div>
      </div>

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
              className="btn btn-primary btn-sm"
              disabled={pending || only?.length === 0}
              onClick={() => {
                if (p.action!.kind === 'review-insights') return onOpenInsights();
                if (p.action!.kind === 'write-insights') {
                  return run(() => reanalyse(p.id, only ?? undefined), 'The insights are written.');
                }
                run(
                  () => closeCollection(p.surveyId!, only ?? undefined),
                  'Collection closed · ปิดรับคำตอบแล้ว',
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
             */}
            {!p.closedOn && p.surveyId && p.answers > 0 && (
              <>
                <button
                  className="btn btn-quiet btn-sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => closeCollection(p.surveyId!), 'Collection closed · ปิดรับคำตอบแล้ว')
                  }
                >
                  {pending ? 'Closing and analysing…' : 'Close collection and write the insights'}
                </button>
                <p className="hintline">
                  Closing stops new answers and starts the analysis. It takes a few minutes.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* the survey link, so it can be sent again */}
      {p.token && (
        <div className="pd-sec">
          <h2>The link</h2>
          <div className="linkbox">
            <span>{forDisplay(origin)}/s/{p.token}</span>
          </div>
          <p className="hintline">
            {p.closedOn
              ? 'Closed — anyone opening it now is told so.'
              : 'Still open. Forward it to anyone who should have a say.'}
          </p>

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
          {/* A stakeholder replying the day after collection closed is not an
              edge case. Reopening leaves the insights alone: what it says was true
              of the answers it was written from, and it keeps saying so. */}
          {p.closedOn && (
            <button
              className="btn btn-quiet btn-sm"
              disabled={pending}
              onClick={() => run(() => reopenCollection(p.id), 'Collection reopened.')}
            >
              {pending ? 'Reopening…' : 'Reopen for more answers'}
            </button>
          )}
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

      {/* gate 4 — archive */}
      <div className="pd-sec pd-archive">
        <h2>Finished with this project?</h2>
        <p>
          Archiving moves it out of your live list. Nothing is deleted — the survey, the answers
          and the insights stay searchable. Only your team can do this; the app never archives
          anything by itself. · ข้อมูลไม่ถูกลบ ค้นหาได้เสมอ
        </p>
        {confirmArchive ? (
          <div className="confirmrow">
            <button
              className="btn btn-primary btn-sm"
              disabled={pending}
              onClick={() =>
                run(() => archiveProject(p.id), `${p.clientName} archived · เก็บเข้าคลังแล้ว`)
              }
            >
              {pending ? 'Archiving…' : `Yes, archive ${p.clientName}`}
            </button>
            <button className="linkish" onClick={() => setConfirmArchive(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-quiet btn-sm" onClick={() => setConfirmArchive(true)}>
            Archive project
          </button>
        )}
      </div>
    </Sheet>
  );
}
