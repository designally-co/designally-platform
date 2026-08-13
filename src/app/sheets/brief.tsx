'use client';

import { useState, useTransition } from 'react';

import {
  confirmBrief,
  deleteBrief,
  readBriefVersion,
  unconfirmBrief,
} from '@/lib/team/actions';

import type { Brief } from '@/lib/analysis/schema';
import type { ProjectView } from '@/lib/team/projects';
import Sheet from './sheet';

/**
 * The brief, in the order of docs/insight-engine-spec.md — what a person needs
 * first, not the order questions were asked. Ported from
 * reference/brief-one-page.html.
 *
 * Every count on this page is `array.length`. Nothing is a percentage, because
 * the schema has nowhere to put one.
 */

function names(list: string[]) {
  if (!list.length) return 'nobody';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** "3 of 5" is honest; a percentage is not. */
function outOf(some: number, all: number) {
  return `${some} of ${all}`;
}

/**
 * The outline, as plain text, for the deck the team builds in Canva by hand.
 *
 * Canva has no import worth the integration — its Connect API autofills brand
 * templates on a paid plan and would tie this platform to somebody else's API
 * staying still. A copy button costs nothing and the team keeps the design.
 *
 * DECIDE slides keep their marker in the pasted text: their position early in
 * the deck is the whole point of the running order, and a plain list of titles
 * loses it.
 */
function CopyOutline({
  slides,
  confirmed,
}: {
  slides: Brief['deckOutline'];
  confirmed: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const text = slides
    .map((s, i) => `${i + 1}. ${s.needsDecision ? 'DECIDE: ' : ''}${s.title}\n   ${s.purpose}`)
    .join('\n\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* a refused clipboard is not an error state — select it by hand */
      setCopied(false);
    }
  }

  /**
   * Rule 6 — nothing reaches a client before a human confirms it.
   *
   * This outline becomes the deck the client is sat in front of, so copying it
   * out is the moment it leaves the building. Confirming is a gate, not a
   * formality, and a gate you can walk around is decoration.
   */
  if (!confirmed) {
    return (
      <span className="copylocked">Confirm the brief to copy this</span>
    );
  }

  return (
    <button className="btn btn-quiet copyoutline" onClick={copy} aria-live="polite">
      {copied ? 'Copied' : 'Copy outline'}
    </button>
  );
}

function Quotes({ quotes }: { quotes: string[] }) {
  if (!quotes.length) return null;
  return (
    <div className="quotes">
      {quotes.map((q, i) => (
        /* the client's own words, in the language they wrote them */
        <blockquote key={i}>
          <span className="qt">{q}</span>
        </blockquote>
      ))}
    </div>
  );
}

export default function BriefSheet({
  project,
  onClose,
  onConfirmed,
}: {
  project: ProjectView;
  onClose: () => void;
  onConfirmed: (message: string) => void;
}) {
  const [busy, start] = useTransition();
  /* which version is on screen — the newest until somebody opens an older one */
  const [shown, setShown] = useState<{ id: string; brief: Brief } | null>(null);
  const versions = project.briefVersions;
  const current = versions.find((v) => v.isNewest) ?? versions[0];
  const openId = shown?.id ?? current?.id;
  const openVersion = versions.find((v) => v.id === openId) ?? current;
  const brief = (shown?.brief ?? project.brief) as Brief;
  const people = project.answers;

  function act(run: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    start(async () => {
      const res = await run();
      onConfirmed(res.ok ? done : (res.error ?? 'That did not work.'));
    });
  }

  return (
    <Sheet title={`${project.clientName} — survey analysis`} onClose={onClose}>
      <div className="brief">
        {/* 1 · read this first */}
        <h1>{brief.headline}</h1>
        <p className="lede">
          Written from the {people === 1 ? 'single answer' : `${people} answers`} collected before
          the team closed this survey
          {project.briefWrittenOn ? ` · ${project.briefWrittenOn}` : ''}
        </p>
        <p className="firstpara">{brief.headlineBody}</p>

        {/* 2 · settled */}
        <section className="bsec">
          <h3>Settled — design on this without asking</h3>
          {brief.settled.length ? (
            <ul className="agree">
              {brief.settled.map((a, i) => (
                <li key={i}>
                  <span className="ck" aria-hidden="true">
                    ✓
                  </span>
                  <span className="txt">
                    {a.statement}
                    <Quotes quotes={a.quotes} />
                  </span>
                  <span className="n">{outOf(a.respondents.length, people)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet">
              Nothing was agreed independently by more than one person. That is itself the finding.
            </p>
          )}
        </section>

        {/* 3 · unsettled — these become the DECIDE slides */}
        <section className="bsec">
          <h3>Unsettled — resolve at the kick-off</h3>
          {brief.unsettled.length ? (
            brief.unsettled.map((c, i) => (
              <article className="conflict" key={i}>
                <div className="h">
                  <b>{c.question}</b>
                  <span className={`sev ${c.severity === 'high' ? 'hi' : c.severity === 'medium' ? 'md' : 'lo'}`}>
                    {c.severity.toUpperCase()}
                  </span>
                </div>
                <div className="sides">
                  {c.sides.map((s, j) => (
                    <div className="side" key={j}>
                      <b>{s.position}</b>
                      <span className="who">
                        {names(s.respondents)} · {outOf(s.respondents.length, people)}
                      </span>
                      <Quotes quotes={s.quotes} />
                    </div>
                  ))}
                </div>
                <p className="why">{c.severityReason}</p>
              </article>
            ))
          ) : (
            <p className="quiet">No contradictions found. Worth a sceptical read — it is unusual.</p>
          )}
        </section>

        {/* 4 · not decided by the client yet */}
        <section className="bsec">
          <h3>Not decided by the client yet</h3>
          {brief.notDecidedYet.length ? (
            <ul className="insights">
              {brief.notDecidedYet.map((g, i) => (
                <li key={i}>
                  <b>{g.topic}</b> — {g.whatWasSeen}
                  <span className="conseq">{g.consequence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet">Nothing obviously undecided.</p>
          )}
        </section>

        {/* 6 · signals */}
        <section className="bsec">
          <h3>Signals</h3>
          <div className="signal">
            <div className="lab">Internal alignment</div>
            <p>
              <b>{brief.alignment}</b> — {brief.alignmentReason}
            </p>
          </div>
          {brief.flags.map((f, i) => (
            <div className="signal" key={i}>
              <div className="lab">{f.label}</div>
              <p>{f.finding}</p>
            </div>
          ))}
        </section>

        {/* 7 · deck outline */}
        <section className="bsec">
          <div className="bsechead">
            <h3>Kick-off deck outline</h3>
            <CopyOutline slides={brief.deckOutline} confirmed={!!openVersion?.confirmedOn} />
          </div>
          <ul className="slides">
            {brief.deckOutline.map((s, i) => (
              <li key={i}>
                <span className="sn">{i + 1}</span>
                <span>
                  {s.title}
                  <span className="purpose">{s.purpose}</span>
                </span>
                {s.needsDecision && <span className="need">DECIDE</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* 8 · internal only — rule 8 */}
        <section className="bsec">
          <h3>How to run the room</h3>
          <div className="internal">
            <div className="lock">INTERNAL — NEVER SHOWN TO THE CLIENT</div>
            {brief.howToRunTheRoom.map((n, i) => (
              <p key={i}>
                <b>{n.heading}</b> {n.body}
              </p>
            ))}
          </div>
        </section>

        {/* every run this project has had. Re-analysing has always kept them;
            nothing ever showed them. */}
        {versions.length > 1 && (
          <section className="bsec">
            <h3>Versions</h3>
            <ul className="bversions">
              {versions.map((v) => (
                <li key={v.id} className={v.id === openId ? 'on' : undefined}>
                  <button
                    className="pick"
                    onClick={() =>
                      v.isNewest
                        ? setShown(null)
                        : start(async () => {
                            const b = await readBriefVersion(v.id);
                            if (b) setShown({ id: v.id, brief: b });
                          })
                    }
                  >
                    <b>{v.writtenOn}</b>
                    <span>
                      {v.isNewest && 'newest'}
                      {v.isNewest && v.confirmedOn && ' · '}
                      {v.confirmedOn
                        ? `confirmed ${v.confirmedOn}${v.confirmedBy ? ` by ${v.confirmedBy}` : ''}`
                        : !v.isNewest && 'not confirmed'}
                    </span>
                  </button>
                  {/* deleting takes two deliberate steps once somebody has signed it */}
                  {!v.confirmedOn && versions.length > 1 && (
                    <button
                      className="drop"
                      disabled={busy}
                      onClick={() => act(() => deleteBrief(v.id), 'Version deleted.')}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* gate 2 — rule 2 records who acted, rule 1 never does it on a timer */}
        <section className="bsec gate">
          {project.briefStale && (
            <p className="stale">
              Answers arrived after this was confirmed. What it says was true of the answers it was
              written from — regenerate to take the newer ones in.
            </p>
          )}
          {openVersion?.confirmedOn ? (
            <p className="confirmed">
              Confirmed {openVersion.confirmedOn}
              {openVersion.confirmedBy && <> by {openVersion.confirmedBy}</>}. The deck outline can
              be copied.{' '}
              <button
                className="linky"
                disabled={busy}
                onClick={() => act(() => unconfirmBrief(openVersion.id), 'Confirmation removed.')}
              >
                Un-confirm
              </button>
            </p>
          ) : (
            <>
              <h3>Is this right?</h3>
              <p>
                Nothing here has reached the client. Confirming says a person has read it and stands
                behind it — the analysis mistakes two wordings of one idea for a disagreement often
                enough that this step cannot be skipped. Your name is recorded against it.
              </p>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => act(() => confirmBrief(project.id), 'Brief confirmed.')}
              >
                {busy ? 'Confirming' : 'Confirm the brief'}
              </button>
            </>
          )}
        </section>
      </div>
    </Sheet>
  );
}
