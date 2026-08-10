'use client';

import { useMemo, useState } from 'react';

import type { LibraryBlock } from '@/lib/team/library-types';
import type { ProjectView } from '@/lib/team/projects';
import NewSurveySheet from './sheets/new-survey';
import ProjectSheet from './sheets/project';
import TemplatesSheet from './sheets/templates';
import PastSheet from './sheets/past';
import ComingSheet from './sheets/coming';
import Toast, { useToast } from './toast';

const WORDS = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'];

type Panel = 'new' | 'templates' | 'past' | 'coming' | null;

export default function Today({
  today,
  live,
  archived,
  library,
  signOut,
}: {
  today: string;
  live: ProjectView[];
  archived: ProjectView[];
  library: LibraryBlock[];
  signOut: () => Promise<void>;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const toast = useToast();

  const needs = useMemo(() => live.filter((p) => p.action), [live]);
  const ordered = useMemo(
    () => [...needs, ...live.filter((p) => !p.action)],
    [live, needs],
  );

  const project = openProject ? live.find((p) => p.id === openProject) : null;

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
      <header className="topbar">
        <div className="inner">
          <span className="wordmark">
            Design<em>ally</em>
          </span>
          <span className="today">{today}</span>
          <button className="btn btn-primary btn-sm topbar-cta" onClick={() => setPanel('new')}>
            New survey
          </button>
          <form action={signOut}>
            <button className="linkish" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

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
                    className="btn btn-primary btn-sm"
                    onClick={() => setOpenProject(p.id)}
                  >
                    {p.action!.label}
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
                <th scope="col">Stage</th>
                <th scope="col">Answers</th>
                <th scope="col">Latest</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((p) => (
                <tr
                  key={p.id}
                  tabIndex={0}
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
                  <td className="c-stage" data-label="Stage">
                    {/* the segment count follows the package — never five by default */}
                    <div className="stage" aria-hidden="true">
                      {p.flow.map((s, i) => (
                        <i key={s} className={i < p.stage ? 'on' : i === p.stage ? 'now' : ''} />
                      ))}
                    </div>
                    <div className="c-main">
                      {p.flow[p.stage]} · {p.stage + 1} of {p.flow.length}
                    </div>
                  </td>
                  <td data-label="Answers">
                    {p.answers ? (
                      <>
                        <div className="c-main">
                          {p.answers} answer{p.answers === 1 ? '' : 's'}
                        </div>
                        <div className="c-when">
                          {/* words, never a coloured glyph — docs/navigation-decisions.md */}
                          {p.decidedBy ? `${p.decidedBy} decides` : 'no decision maker named'}
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

        <div className="elsewhere">
          <button onClick={() => setPanel('templates')}>
            <span className="et">Question templates</span>
            <span className="es">
              {library.reduce((n, b) => n + b.questions.length, 0)} questions in{' '}
              {library.length} blocks · what clients are asked
            </span>
          </button>
          <button onClick={() => setPanel('past')}>
            <span className="et">Past projects</span>
            <span className="es">
              {archived.length} archived · briefs and decks stay searchable
            </span>
          </button>
          <button onClick={() => setPanel('coming')}>
            <span className="et">What&apos;s coming</span>
            <span className="es">The analysis, the gates, and the website track</span>
          </button>
        </div>
      </main>

      {panel === 'new' && (
        <NewSurveySheet
          library={library}
          onClose={() => setPanel(null)}
          onCreated={(msg) => toast.show(msg)}
        />
      )}
      {panel === 'templates' && (
        <TemplatesSheet library={library} onClose={() => setPanel(null)} />
      )}
      {panel === 'past' && (
        <PastSheet
          archived={archived}
          onClose={() => setPanel(null)}
          onRestored={(msg) => toast.show(msg)}
        />
      )}
      {panel === 'coming' && <ComingSheet onClose={() => setPanel(null)} />}
      {project && (
        <ProjectSheet
          project={project}
          onClose={() => setOpenProject(null)}
          onActed={(msg) => {
            setOpenProject(null);
            toast.show(msg);
          }}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
