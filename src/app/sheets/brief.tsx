'use client';

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
}: {
  project: ProjectView;
  onClose: () => void;
}) {
  const brief = project.brief as Brief;
  const people = project.answers;

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
          <h3>Kick-off deck outline</h3>
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

        <p className="hintline">
          Nothing here has reached the client. Confirming the brief and building the deck arrive in
          milestone 4.
        </p>
      </div>
    </Sheet>
  );
}
