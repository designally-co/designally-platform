'use client';

import { useState, useTransition } from 'react';

import {
  archiveProject,
  closeCollection,
  deleteResponse,
  reopenCollection,
} from '@/lib/team/actions';
import type { ProjectView } from '@/lib/team/projects';
import { forDisplay } from '@/lib/survey/link';
import Sheet from './sheet';

/**
 * Everything about one client. Six sections, in the order of
 * docs/complete-flow.md: right now · where it is · who answered · decided at
 * the kick-off · documents · archive.
 *
 * The decisions and documents sections have nothing to show until milestones 3
 * and 4. They say so rather than being hidden, because "nothing produced yet"
 * is a true statement about the project and an empty space is not.
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
  onReadAnswers: () => void;
  onClose: () => void;
  onActed: (message: string) => void;
}) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  /* which response has already been warned about, so the next press deletes */
  const [warned, setWarned] = useState<string | null>(null);
  /**
   * Whose answers the analysis should read. Null is everyone, which is the
   * default and nearly always what happens — the subset exists to see the insights
   * without an outlier or a duplicate, not as a routine step, so it stays out
   * of the way until somebody opens it.
   */
  const [only, setOnly] = useState<string[] | null>(null);
  const [picking, setPicking] = useState(false);

  /* `onRefused` lets a caller treat a refusal as a step rather than a failure —
     deleting a response a confirmed insights read comes back refused the first
     time, with the reason, and the second press goes through. */
  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
    onRefused?: () => void,
  ) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        onRefused?.();
        return;
      }
      setWarned(null);
      onActed(message);
    });

  return (
    <Sheet title="Project" onClose={onClose}>
      <div className="pd-head">
        <h1>{p.clientName}</h1>
        <div className="pkg">
          {p.packageLabel} · {p.flow[p.stage]} · step {p.stage + 1} of {p.flow.length}
          {p.projectCode ? ` · ${p.projectCode}` : ''}
        </div>
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
                answer is "all of them" almost every time. */}
            {p.people.length > 1 && (
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
            <button
              className="btn btn-primary btn-sm"
              disabled={pending || only?.length === 0}
              onClick={() =>
                run(
                  () => closeCollection(p.surveyId!, only ?? undefined),
                  `Collection closed · ปิดรับคำตอบแล้ว`,
                )
              }
            >
              {pending ? 'Closing…' : p.action.label}
            </button>
            <p className="hintline">
              This records that you closed it, and when. Writing the insights arrives in milestone 3.
            </p>
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

      {/* where it is */}
      <div className="pd-sec">
        <h3>Where it is</h3>
        <ul className="tl">
          {p.flow.map((stage, i) => {
            const cls = i < p.stage ? 'done' : i === p.stage ? 'now' : 'next';
            let when = '';
            if (stage === 'Survey' && p.sentOn) when = `sent ${p.sentOn}`;
            if (stage === 'Analysis' && p.closedOn) when = `closed with ${p.answers} answers`;
            return (
              <li className={cls} key={stage}>
                <span>{stage}</span>
                <span className="when">{when}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* who answered */}
      <div className="pd-sec">
        <h3>Who answered</h3>
        {p.people.length ? (
          <>
            <div className="pd-people">
              {p.people.map((person) => (
                <div className="person" key={person.id}>
                  <b>{person.name}</b>
                  <span className="role">{person.email || 'no email given'}</span>
                  {/* a duplicate submission, or a test one. Two presses when a
                      confirmed insights read it — the first says what would go. */}
                  <button
                    className="drop"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => deleteResponse(person.id, warned === person.id),
                        `${person.name}'s answers deleted.`,
                        () => setWarned(person.id),
                      )
                    }
                  >
                    {warned === person.id ? 'Delete anyway' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
            {/* the analysis reports what the team might miss; reading what was
                actually said is their own work, and this is where they do it */}
            <button className="btn btn-quiet" onClick={onReadAnswers}>
              Read what they said
            </button>
          </>
        ) : (
          <p className="quiet">Nobody has answered yet.</p>
        )}
      </div>

      {/* the survey link, so it can be sent again */}
      {p.token && (
        <div className="pd-sec">
          <h3>The link</h3>
          <div className="linkbox">
            <span>{forDisplay(origin)}/s/{p.token}</span>
          </div>
          <p className="hintline">
            {p.closedOn
              ? 'Closed — anyone opening it now is told so.'
              : 'Still open. Forward it to anyone who should have a say.'}
          </p>
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

      {/* decided at the kick-off */}
      <div className="pd-sec">
        <h3>Decided at the kick-off</h3>
        <p className="quiet">Nothing recorded yet — this fills in after the kick-off meeting.</p>
      </div>

      {/* documents */}
      <div className="pd-sec">
        <h3>Documents</h3>
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
        <h3>Finished with this project?</h3>
        <p>
          Archiving moves it out of your live list. Nothing is deleted — the survey, the answers,
          the insights and the decisions stay searchable. Only your team can do this; the app never
          archives anything by itself. · ข้อมูลไม่ถูกลบ ค้นหาได้เสมอ
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
