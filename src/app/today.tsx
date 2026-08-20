'use client';

import { useMemo, useState } from 'react';

import type { LibraryBlock } from '@/lib/team/library-types';
import type { ProjectAnswers } from '@/lib/team/answers';
import type { ProjectView } from '@/lib/team/projects';
import { plural } from '@/lib/team/words';
import { readAnswers } from '@/lib/team/actions';
import NewSurveySheet from './sheets/new-survey';
import SurveyMadeSheet from './sheets/survey-made';
import ProjectSheet from './sheets/project';
import AnswersSheet from './sheets/answers';
import InsightsSheet from './sheets/insights';
import PastSheet from './sheets/past';
import Toolbar from './toolbar';
import Toast, { useToast } from './toast';

const WORDS = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'];

type Panel = 'new' | 'past' | null;

export default function Today({
  today,
  partOfDay,
  live,
  archived,
  library,
  origin,
  signOut,
}: {
  today: string;
  /** "this morning" / "this afternoon" / "this evening" — see lib/team/projects */
  partOfDay: string;
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

  const needs = useMemo(() => live.filter((p) => p.action), [live]);
  /**
   * One list of every running project — 20 August 2026, asked for.
   *
   * The page had two sections: cards for work blocked on the team, and a quiet
   * list for everything else. That was PRODUCT.md's first design principle
   * expressed literally — priority as form, the demotion carried by the absence
   * of a container — and it is now expressed in the toolbar instead. What
   * needs a person is behind the bell; the page is the roster.
   *
   * The ones with something outstanding still sort first, because a list of
   * ten wants its live end at the top, and each carries a mark. The mark's
   * legend is the line above the list, which counts them in words — see
   * `docs/navigation-decisions.md` on bare glyphs.
   */
  const ordered = useMemo(
    () => [...needs, ...live.filter((p) => !p.action)],
    [live, needs],
  );

  const project = openProject ? live.find((p) => p.id === openProject) : null;
  const insightsProject = openInsights ? live.find((p) => p.id === openInsights) : null;

  /**
   * An empty screen is success. Say so and let them close the laptop.
   *
   * The greeting still answers "is there anything I have to do", and it is
   * still the first thing on the page — but what it counts now lives in the
   * bell rather than in a section below it, so the sentence under it says
   * where to look.
   */
  const heading =
    needs.length === 0 ? (
      <>
        Nothing needs you <em>right now</em>.
      </>
    ) : (
      <>
        {WORDS[needs.length] ?? `${needs.length} things`} need{needs.length === 1 ? 's' : ''} you{' '}
        {/* The hour, not the word "morning". It said morning at every hour of
            the day — the one sentence on a page of plain fact that could be
            read at four in the afternoon and be wrong. See `partOfDay`. */}
        <em>{partOfDay}</em>.
      </>
    );

  /**
   * The line under the greeting, and the mark's legend.
   *
   * `docs/navigation-decisions.md`: a bare glyph needs a legend where words do
   * not. The dot on a row is exactly that glyph, so the sentence that
   * introduces the list names it and counts it — which means nobody has to
   * learn what the dot means, and the count is stated in words for a reader
   * who never sees either.
   */
  const sub =
    live.length === 0
      ? 'Nothing is running.'
      : needs.length === 0
        ? `${plural(live.length, 'project')} running, all moving on their own. Close the laptop.`
        : `${plural(live.length, 'project')} running · the ${needs.length === 1 ? 'one' : needs.length} marked below ${needs.length === 1 ? 'is' : 'are'} in the bell.`;

  return (
    /**
     * The team app's own ground, from 19 August 2026.
     *
     * `.paper` here is the same three-token swap `.sheet.paper` makes, applied
     * one level up. Every sheet went white today and the page did not, so
     * opening a project inverted the relationship under the reader: a white
     * card on a grey page became grey cards on a white sheet. One app, one
     * direction of depth.
     *
     * A wrapper rather than `:root`, because the client survey shares this
     * `body` and has its own ground — `.survey-shell` sets `--parchment` for
     * itself and would not want `--canvas` moving underneath it.
     */
    <div className="deck paper">
      <Toolbar
        today={today}
        needs={needs}
        onOpenProject={(id) => setOpenProject(id)}
        archivedCount={archived.length}
        onNewSurvey={() => setPanel('new')}
        onPastProjects={() => setPanel('past')}
        signOut={signOut}
      />

      <main className="page">
        <h1 className="greet">{heading}</h1>
        <p className="greet-sub">{sub}</p>

        {/**
         * A short list of sentences — 20 August 2026.
         *
         * This was a three-column table with a `<thead>`, a `data-label`
         * pseudo-element hack to survive a phone, a visually-hidden `<caption>`
         * explaining that rows could be pressed, and a "click any project to
         * open it" hint in the section head. PRODUCT.md names that shape by
         * name in its anti-references: the team's screens "must not resemble a
         * project-management dashboard, a CRM, or an analytics tool… it needs
         * a short list of sentences."
         *
         * Every one of those four pieces of scaffolding existed to make a
         * table behave like a list of buttons. A list of buttons needs none of
         * them: `<button>` carries Enter, Space, focus and the announcement
         * that this thing activates, for free and in every reader, and one
         * column cannot break on a narrow screen.
         *
         * No heading over it and no count beside one. It is the only list on
         * the page now, and the sentence above already counts it — a heading
         * would be a label on the page's single subject.
         */}
        {live.length === 0 ? (
          <div className="calm">
            <p>No projects yet. Create the first survey when a deal is signed.</p>
          </div>
        ) : (
          <ul className="plist">
            {ordered.map((p) => (
              <li key={p.id}>
                <button
                  className="prow"
                  type="button"
                  /**
                   * Named outright rather than left to be computed.
                   *
                   * The row's text is four runs across two blocks and an inline
                   * span, and how a browser joins those into one announced
                   * string is not something to find out from a client. Stated
                   * here it is the same in every reader, it carries every fact
                   * the row shows rather than only the name, and it ends with
                   * what pressing does — which the visible row says by being a
                   * button and the label otherwise would not say at all.
                   *
                   * The mark is drawn with no text at all, so this is the only
                   * place a reader is told the project needs somebody.
                   */
                  aria-label={[
                    p.action ? 'Needs you.' : null,
                    `${p.clientName}, ${p.packageLabel}.`,
                    `${p.standing.arrived}.`,
                    p.standing.due ? `It ${p.standing.due}.` : null,
                    'Open the project.',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setOpenProject(p.id)}
                >
                  <span className="pname">
                    {/* The mark, on the rows with something waiting. Its legend
                        is the line above the list, which counts these in
                        words — a bare glyph needs one and this one has it. */}
                    {p.action && <i className="pmark" aria-hidden="true" />}
                    {/* The package sits with the name because it identifies the
                        project rather than describing its state — a Brand and a
                        Design job for the same client are two rows.

                        The space between them is real and in the markup, and it
                        is the only thing separating the two for a screen
                        reader: the middot is drawn by CSS so it cannot be
                        selected or copied into a client's name, and what CSS
                        draws is not in the accessible name. Without it the row
                        announced "Siam Piwat Retail GroupDesign". */}
                    {p.clientName}{' '}
                    <span className="ppkg">{p.packageLabel}</span>
                  </span>
                  <span className="pstate">
                    {p.standing.arrived}
                    {p.standing.due && <span className="pdue">{p.standing.due}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
