'use client';

import { useState, useTransition } from 'react';

import { deleteInsights, reanalyse, readInsightsVersion } from '@/lib/team/actions';

import type { Insights } from '@/lib/analysis/schema';
import type { ProjectView } from '@/lib/team/projects';
import Sheet from './sheet';

/**
 * The insights, in the order of docs/insight-engine-spec.md — what a person needs
 * first, not the order questions were asked. Ported from
 * reference/insights-one-page.html.
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
 * Whose answers this version read.
 *
 * Every count below is counted from these and no others, so it belongs above
 * them rather than in a footnote — a reader who meets "2 of 3" first and learns
 * afterwards that it was three of five has already drawn the wrong conclusion.
 *
 * Names come from the insights's own snapshot rather than from the project, so a
 * respondent deleted since still appears. When they do, say so: otherwise
 * somebody hunting for that person in "Who answered" finds nothing and has no
 * way to tell whether the insights are wrong or the answers are gone.
 */
function Sources({
  version,
  onProject,
  writtenOn,
}: {
  version: ProjectView['insightsVersions'][number] | undefined;
  onProject: { id: string }[];
  writtenOn: string | null;
}) {
  const when = writtenOn ? ` · ${writtenOn}` : '';

  /* insights written before sources were stored. Saying so is more use than a
     guess that happens to be right most of the time. */
  if (!version?.sources) {
    return (
      <p className="lede">
        Whose answers this read was not recorded — it was written before that was kept{when}
      </p>
    );
  }

  const live = new Set(onProject.map((p) => p.id));
  const gone = version.sources.filter((s) => !live.has(s.id)).length;

  return (
    <p className="lede">
      Written from {version.sources.length === 1 ? '1 answer' : `${version.sources.length} answers`}
      {when}
      <span className="sourcenames">
        {version.sources.map((s) => (
          <span key={s.id} className={live.has(s.id) ? undefined : 'gone'}>
            {s.name}
            {!live.has(s.id) && ' · deleted since'}
          </span>
        ))}
      </span>
      {version.sources.length < onProject.length && (
        <span className="sourcenote">
          This project now has {onProject.length} answers. This version read{' '}
          {version.sources.length} of them.
        </span>
      )}
      {gone > 0 && (
        <span className="sourcenote">
          {gone === 1 ? 'One answer it read has' : `${gone} answers it read have`} been deleted
          since.
        </span>
      )}
    </p>
  );
}

/**
 * Status to tone. The system has exactly three semantic tones and they already
 * mean this elsewhere, so nothing new enters the palette — these two readings
 * simply stop being rendered as grey.
 */
const ALIGNMENT_TONE: Record<string, string> = {
  'high consensus': 'ok',
  'some divergence': 'md',
  fragmented: 'hi',
};

const SEVERITY_TONE: Record<string, string> = { high: 'hi', medium: 'md', low: 'lo' };

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

export default function InsightsSheet({
  project,
  backLabel,
  onClose,
  onConfirmed,
}: {
  project: ProjectView;
  /** where back goes — the project, when the sheet was opened from one */
  backLabel?: string;
  onClose: () => void;
  onConfirmed: (message: string) => void;
}) {
  const [busy, start] = useTransition();
  /* which version is on screen — the newest until somebody opens an older one */
  const [shown, setShown] = useState<{ id: string; insights: Insights } | null>(null);
  const versions = project.insightsVersions;
  const current = versions.find((v) => v.isNewest) ?? versions[0];
  const openId = shown?.id ?? current?.id;
  const openVersion = versions.find((v) => v.id === openId) ?? current;
  const insights = (shown?.insights ?? project.insights) as Insights;
  /**
   * The denominator in "2 of 5" — how many answers *this version* read.
   *
   * It was `project.answers`, the number the project has now, and that is a
   * different number the moment a version reads a subset or somebody answers
   * after it was written. A run over two respondents reported "2 of 5", which
   * reads as three people declining to agree when in fact three were never
   * asked. Rule 7 is that "2 of 3" is honest; a fraction whose denominator is
   * not the set it was counted from is not.
   *
   * `sources` is that set, stored per run. Versions written before it was kept
   * fall back to the project's count, which is what they were counted from
   * then — every run read everybody until the picker existed.
   */
  const people = openVersion?.sources?.length ?? project.answers;

  /**
   * Whose answers the next run should read. Null is everyone, which is the
   * default and what the button says when nothing has been touched.
   */
  const [only, setOnly] = useState<string[] | null>(null);
  const [picking, setPicking] = useState(false);

  /**
   * Who answered after the version on screen was written.
   *
   * The useful question when re-running is not *when* somebody answered, it is
   * whether the version you are looking at already read them — which is exactly
   * what `sources` records, and it is stored per run for this reason. Runs
   * written before sources were stored have none, and then nobody is marked
   * rather than everybody being marked wrongly.
   */
  const readAlready = new Set(openVersion?.sources?.map((s) => s.id) ?? []);
  const sinceThis = openVersion?.sources
    ? project.people.filter((p) => !readAlready.has(p.id))
    : [];

  function act(run: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    start(async () => {
      const res = await run();
      onConfirmed(res.ok ? done : (res.error ?? 'That did not work.'));
    });
  }

  return (
    <Sheet title={`${project.clientName} — insights`} backLabel={backLabel} onClose={onClose}>
      <div className="insights">
        {/* 1 · read this first */}
        <h1>{insights.headline}</h1>
        <Sources
          version={openVersion}
          onProject={project.people}
          writtenOn={openVersion?.writtenOn ?? project.insightsWrittenOn}
        />
        <p className="firstpara">{insights.headlineBody}</p>

        {/* 2 · settled */}
        <section className="isec">
          <h2>Settled — design on this without asking</h2>
          {insights.settled.length ? (
            <ul className="agree">
              {insights.settled.map((a, i) => (
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
        <section className="isec">
          <h2>Unsettled — still to decide</h2>
          {insights.unsettled.length ? (
            insights.unsettled.map((c, i) => (
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
        <section className="isec">
          <h2>Not decided by the client yet</h2>
          {insights.notDecidedYet.length ? (
            <ul className="gaps">
              {insights.notDecidedYet.map((g, i) => (
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
        <section className="isec">
          <h2>Signals</h2>
          <div className="signal">
            <div className="lab">
              Internal alignment
              {/* Three named states rendered identically until now. This is the
                  line that sets expectations for revision rounds, so how worried
                  to be is the whole content of it. The word stays — colour is
                  never the only cue. */}
              <span className={`sev ${ALIGNMENT_TONE[insights.alignment] ?? 'lo'}`}>
                {insights.alignment}
              </span>
            </div>
            <p>{insights.alignmentReason}</p>
          </div>
          {insights.flags.map((f, i) => (
            <div className="signal" key={i}>
              <div className="lab">
                {f.label}
                {/* the engine grades every flag and the sheet used to drop it,
                    so a single-respondent warning read like a footnote */}
                <span className={`sev ${SEVERITY_TONE[f.severity] ?? 'lo'}`}>{f.severity}</span>
              </div>
              <p>{f.finding}</p>
            </div>
          ))}
        </section>

        {/* every run this project has had. Re-analysing has always kept them;
            nothing ever showed them. */}
        {versions.length > 1 && (
          <section className="isec">
            <h2>Versions</h2>
            <ul className="iversions">
              {versions.map((v) => (
                <li key={v.id} className={v.id === openId ? 'on' : undefined}>
                  <button
                    className="pick"
                    onClick={() =>
                      v.isNewest
                        ? setShown(null)
                        : start(async () => {
                            const b = await readInsightsVersion(v.id);
                            if (b) setShown({ id: v.id, insights: b });
                          })
                    }
                  >
                    <b>{v.writtenOn}</b>
                    <span>
                      {v.isNewest
                        ? 'newest'
                        : v.sources
                          ? `${v.sources.length === 1 ? '1 answer' : `${v.sources.length} answers`}`
                          : ''}
                    </span>
                  </button>
                  {/* not the last one — a project with insights needs a version
                      to show them in */}
                  {versions.length > 1 && (
                    <button
                      className="drop"
                      disabled={busy}
                      onClick={() => act(() => deleteInsights(v.id), 'Version deleted.')}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/**
         * Running it again, on whichever answers you choose.
         *
         * `reanalyse` and the versions list have both existed for a while and
         * nothing reached them once an analysis had been written: the only
         * button that called it appeared when a run had *failed*. So the
         * ordinary case — closed, read, reopened, somebody else answered,
         * closed again — could produce a second version only by closing
         * collection a second time, which reads everyone and gives no say in
         * it.
         *
         * Every run is kept, and a new one neither replaces nor demotes an
         * older one: it arrives at the top of the list and the rest stay
         * openable. This is the last thing the platform does — gate 2 was
         * retired on 18 August 2026 and the job now ends at the insights.
         *
         * The picker answers the three questions actually asked of it: everyone
         * (the default), the same people this version read, or only those it
         * did not. The last two are the reason `sources` is stored per run.
         */}
        {project.people.length > 0 && (
          <section className="isec">
            <h2>Write it again</h2>
            {project.closedOn ? (
              <>
                <p>
                  A new version, from the answers you choose. This one stays exactly as it is —
                  every run is kept, and you can open any of them again.
                </p>

                {sinceThis.length > 0 && (
                  <p className="stale">
                    {sinceThis.length === 1
                      ? `${sinceThis[0].name} answered after this version was written.`
                      : `${sinceThis.length} people answered after this version was written.`}
                  </p>
                )}

                {project.people.length > 1 &&
                  (picking ? (
                    <div className="whoreads">
                      <p className="hintline">Read the answers of:</p>
                      {project.people.map((person) => {
                        const on = only === null || only.includes(person.id);
                        return (
                          <label key={person.id} className="pickwho">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                const base = only ?? project.people.map((x) => x.id);
                                const next = on
                                  ? base.filter((id) => id !== person.id)
                                  : [...base, person.id];
                                /* everyone selected is the same as no selection —
                                   keep it null so the run records it that way */
                                setOnly(next.length === project.people.length ? null : next);
                              }}
                            />
                            <span>{person.name}</span>
                            {!readAlready.has(person.id) && openVersion?.sources && (
                              <small>new since this version</small>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="whoreads">
                      <button className="linky" onClick={() => setPicking(true)}>
                        {only
                          ? `Reading ${only.length} of ${project.people.length} answers — change`
                          : 'Choose whose answers to read'}
                      </button>
                    </div>
                  ))}

                {/* Primary from 18 August 2026. It was quiet because Confirm
                    the insights sat below it and a second filled button would
                    have put the redo and the sign-off at the same weight. Gate 2
                    is gone, so this is the only thing on the sheet that does
                    anything, and a quiet lone button reads as unavailable. */}
                <button
                  className="btn btn-primary"
                  disabled={busy || only?.length === 0}
                  onClick={() =>
                    act(() => reanalyse(project.id, only ?? undefined), 'A new version is written.')
                  }
                >
                  {busy ? 'Writing…' : 'Write the insights again'}
                </button>
              </>
            ) : (
              /* `reanalyse` refuses an open survey and says so; saying it here
                 instead is the difference between a disabled button that
                 explains itself and an error after a wait. */
              <p className="quiet">
                The survey is open again, so there is nothing settled to read. Close collection to
                write another version.
              </p>
            )}
          </section>
        )}

      </div>
    </Sheet>
  );
}
