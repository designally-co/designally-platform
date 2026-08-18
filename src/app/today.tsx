'use client';

import { useMemo, useState, useTransition } from 'react';

import type { LibraryBlock } from '@/lib/team/library-types';
import type { ProjectAnswers } from '@/lib/team/answers';
import type { ProjectView } from '@/lib/team/projects';
import { readAnswers } from '@/lib/team/actions';
import NewSurveySheet from './sheets/new-survey';
import SurveyMadeSheet from './sheets/survey-made';
import ProjectSheet from './sheets/project';
import AnswersSheet from './sheets/answers';
import InsightsSheet from './sheets/insights';
import PastSheet from './sheets/past';
import Toolbar from './toolbar';
import Toast, { useToast } from './toast';
import { reanalyse } from '@/lib/team/actions';

const WORDS = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'];

type Panel = 'new' | 'past' | null;

export default function Today({
  today,
  live,
  archived,
  library,
  origin,
  signOut,
}: {
  today: string;
  live: ProjectView[];
  archived: ProjectView[];
  library: LibraryBlock[];
  /** where a client's survey link points — see lib/survey/origin */
  origin: string;
  signOut: () => Promise<void>;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  /** the survey just created, while its link is still on screen */
  const [made, setMade] = useState<{
    clientName: string;
    packageLabel: string;
    token: string;
    link: string;
  } | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [openInsights, setOpenInsights] = useState<string | null>(null);
  /* answers are fetched when asked for, not shipped with the page */
  const [answers, setAnswers] = useState<{
    name: string;
    data: ProjectAnswers;
    /* whose row was clicked — the sheet opens on them */
    focus: string;
  } | null>(null);
  /**
   * The project a sheet was opened *from*, so back is a step and not a
   * dismissal.
   *
   * The sheets took a back chevron on 17 August 2026, and a chevron makes a
   * promise a Close button never did: it says there is a place behind this one.
   * Answers and insights are both reached from a project, and both used to shut
   * the project on the way in and drop you on the landing page on the way out —
   * so reading one person's answers cost two clicks to get back to where you
   * were. Insights can also be opened from the Needs you card, and then there
   * is no project behind them and back is the page. Null means exactly that.
   */
  const [cameFrom, setCameFrom] = useState<string | null>(null);

  /** back out of a sheet: to the project it was opened from, or to the page */
  const goBack = (leave: () => void) => {
    leave();
    if (cameFrom) setOpenProject(cameFrom);
    setCameFrom(null);
  };
  const toast = useToast();
  const [writing, startWriting] = useTransition();

  const needs = useMemo(() => live.filter((p) => p.action), [live]);
  const ordered = useMemo(
    () => [...needs, ...live.filter((p) => !p.action)],
    [live, needs],
  );

  const project = openProject ? live.find((p) => p.id === openProject) : null;
  const insightsProject = openInsights ? live.find((p) => p.id === openInsights) : null;

  /* An empty screen is success. Say so and let them close the laptop. */
  const heading =
    needs.length === 0 ? (
      <>
        Nothing needs you <em>right now</em>.
      </>
    ) : (
      <>
        {WORDS[needs.length] ?? `${needs.length} things`} need{needs.length === 1 ? 's' : ''} you{' '}
        <em>this morning</em>.
      </>
    );

  const sub =
    needs.length === 0
      ? live.length === 1
        ? '1 project is moving on its own. Close the laptop.'
        : `${live.length} projects are moving on their own. Close the laptop.`
      : `${live.length} ${live.length === 1 ? 'project' : 'projects'} running. Everything not listed below is moving on its own.`;

  return (
    <>
      <Toolbar
        today={today}
        needsCount={needs.length}
        archivedCount={archived.length}
        onNewSurvey={() => setPanel('new')}
        onPastProjects={() => setPanel('past')}
        signOut={signOut}
      />

      <main className="page">
        <h1 className="greet">{heading}</h1>
        <p className="greet-sub">{sub}</p>

        <div className="sec">
          <h2>Needs you</h2>
          <span className="count">{needs.length}</span>
        </div>

        {needs.length ? (
          <div className="worklist">
            {needs.map((p, i) => (
              <article className="work" key={p.id} style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                <div className="body">
                  <div className="name">
                    <span className="dot" aria-hidden="true" />
                    {p.clientName}
                  </div>
                  <p className="say">
                    <b>{p.action!.say}</b> {p.action!.emphasis}
                  </p>
                  <p className="when">{p.action!.when}</p>
                </div>
                <div className="act">
                  <button
                    className="btn btn-primary"
                    disabled={writing}
                    onClick={() => {
                      if (p.action!.kind === 'review-insights') return setOpenInsights(p.id);
                      if (p.action!.kind === 'write-insights') {
                        return startWriting(async () => {
                          const result = await reanalyse(p.id);
                          toast.show(
                            result.ok
                              ? `Insights written for ${p.clientName}`
                              : result.error,
                          );
                        });
                      }
                      setOpenProject(p.id);
                    }}
                  >
                    {writing && p.action!.kind === 'write-insights'
                      ? 'Writing — this takes a few minutes…'
                      : p.action!.label}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="calm">
            <p>
              All clear. We&apos;ll tell you when a survey goes quiet. <em>Have a good one.</em>
            </p>
          </div>
        )}

        <div className="sec">
          <h2>All projects</h2>
          <span className="count">{live.length}</span>
          <span className="hint">click any project to open it</span>
        </div>

        {live.length ? (
          <table className="ptable">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Answers</th>
                <th scope="col">Latest</th>
              </tr>
            </thead>
            {/* one shared description for every row */}
            <caption id="row-hint" className="vh">
              Every row opens that project. Press Enter or Space on a focused row.
            </caption>
            <tbody>
              {ordered.map((p) => (
                /* The row is focusable and opens on Enter or Space, but a
                   screen reader announces a table row and nothing says it is
                   activatable. A role would replace the row semantics and an
                   aria-label would replace the cells a reader needs, so the
                   affordance is described alongside instead of over them. */
                <tr
                  key={p.id}
                  tabIndex={0}
                  aria-describedby="row-hint"
                  onClick={() => setOpenProject(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenProject(p.id);
                    }
                  }}
                >
                  <td data-label="Project">
                    <div className="c-name">
                      {p.action && <i className="pdot" aria-label="needs you" />}
                      {p.clientName}
                    </div>
                    <div className="c-sub">{p.packageLabel}</div>
                  </td>
                  <td data-label="Answers">
                    {p.answers ? (
                      <>
                        <div className="c-main">
                          {p.answers} answer{p.answers === 1 ? '' : 's'}
                        </div>
                        <div className="c-when">
                          {/* words, never a coloured glyph — docs/navigation-decisions.md */}
                          {p.answeredBy ?? 'nobody named'}
                        </div>
                      </>
                    ) : (
                      <div className="c-when">none yet</div>
                    )}
                  </td>
                  <td className="c-when" data-label="Latest">
                    {p.latest[0]}
                    <br />
                    {p.latest[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="calm">
            <p>No projects yet. Create the first survey when a deal is signed.</p>
          </div>
        )}

      </main>

      {panel === 'new' && (
        <NewSurveySheet
          library={library}
          onClose={() => setPanel(null)}
          /* The form is finished the moment the survey exists. What was made
             gets a sheet of its own rather than unfolding under three fields
             nobody can change any more — see survey-made.tsx. */
          onCreated={(m) => {
            setPanel(null);
            setMade(m);
            toast.show(`${m.packageLabel} questionnaire attached.`);
          }}
        />
      )}
      {made && (
        <SurveyMadeSheet
          token={made.token}
          url={`${origin}${made.link}`}
          onClose={() => setMade(null)}
        />
      )}
      {panel === 'past' && (
        <PastSheet
          archived={archived}
          onClose={() => setPanel(null)}
          onRestored={(msg) => toast.show(msg)}
        />
      )}
      {insightsProject?.insights && (
        <InsightsSheet
          project={insightsProject}
          backLabel={cameFrom ? `Back to ${insightsProject.clientName}` : 'Back to all projects'}
          onClose={() => goBack(() => setOpenInsights(null))}
          onConfirmed={(msg) => {
            setOpenInsights(null);
            setCameFrom(null);
            toast.show(msg);
          }}
        />
      )}
      {answers && (
        <AnswersSheet
          data={answers.data}
          clientName={answers.name}
          focus={answers.focus}
          backLabel={cameFrom ? `Back to ${answers.name}` : 'Back to all projects'}
          onDeleted={(msg) => {
            setAnswers(null);
            /* the person is gone, so the project they were on is where to land */
            goBack(() => {});
            toast.show(msg);
          }}
          onClose={() => goBack(() => setAnswers(null))}
        />
      )}
      {project && (
        <ProjectSheet
          /**
           * Keyed, so a different project is a different component.
           *
           * Without it React reuses the instance and every `useState(p.…)`
           * initialiser keeps the first project's value: the date field showed
           * the previous project's date, which — now that the field compares
           * itself against what is saved to decide whether to ask — meant a
           * confirmation appearing on a sheet nobody had touched, offering to
           * change one project's date to another's.
           */
          key={project.id}
          project={project}
          origin={origin}
          onOpenInsights={() => {
            setCameFrom(project.id);
            setOpenProject(null);
            setOpenInsights(project.id);
          }}
          onReadAnswers={async (responseId) => {
            const data = await readAnswers(project.id);
            if (!data) return;
            setCameFrom(project.id);
            setOpenProject(null);
            setAnswers({ name: project.clientName, data, focus: responseId });
          }}
          onClose={() => setOpenProject(null)}
          onActed={(msg) => {
            setOpenProject(null);
            toast.show(msg);
          }}
          /* Says it happened and leaves the sheet open — for the changes a
             person makes *while* reading a project rather than to finish with
             it. See `runStay` in the sheet. */
          onToast={(msg) => toast.show(msg)}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
