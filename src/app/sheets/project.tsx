'use client';

import { useState, useTransition } from 'react';

import { archiveProject, closeCollection } from '@/lib/team/actions';
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
  onOpenBrief,
  onClose,
  onActed,
}: {
  project: ProjectView;
  origin: string;
  onOpenBrief: () => void;
  onClose: () => void;
  onActed: (message: string) => void;
}) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
            <button
              className="btn btn-primary btn-sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => closeCollection(p.surveyId!),
                  `Collection closed · ปิดรับคำตอบแล้ว`,
                )
              }
            >
              {pending ? 'Closing…' : p.action.label}
            </button>
            <p className="hintline">
              This records that you closed it, and when. Writing the brief arrives in milestone 3.
            </p>
          </>
        ) : (
          <p>
            {p.closedOn
              ? `Collection closed on ${p.closedOn}${p.closedByName ? ` by ${p.closedByName}` : ''}, with ${p.answers} ${p.answers === 1 ? 'answer' : 'answers'}. The analysis arrives in milestone 3.`
              : p.answers
                ? `${p.answers} ${p.answers === 1 ? 'answer' : 'answers'} so far, the last one ${p.lastAnswerOn}. Nothing for your team to do — the app will speak up if it goes quiet.`
                : 'The link has been sent. No answers yet.'}
          </p>
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
          <div className="pd-people">
            {p.people.map((person, i) => (
              <div className="person" key={`${person.name}-${i}`}>
                <b>{person.name}</b>
                <span className="role">{person.role || 'role not given'}</span>
                {person.decides && <span className="lead">Decision maker</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="quiet">Nobody has answered yet.</p>
        )}
        {p.people.length > 0 && !p.decidedBy && (
          <p className="quiet" style={{ marginTop: 12 }}>
            No decision maker named. Worth knowing before the kick-off.
          </p>
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
        {p.brief ? (
          <div className="pd-docs">
            <button className="doc" onClick={onOpenBrief}>
              Survey analysis
              <small>
                {p.answers} {p.answers === 1 ? 'answer' : 'answers'}
                {p.briefWrittenOn ? ` · ${p.briefWrittenOn}` : ''}
              </small>
            </button>
          </div>
        ) : (
          <p className="quiet">
            {p.closedOn
              ? 'Collection is closed but no brief was written. Run the analysis again from Needs you.'
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
          the brief and the decisions stay searchable. Only your team can do this; the app never
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
