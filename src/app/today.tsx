'use client';

import { useMemo, useState } from 'react';

import type { LibraryBlock } from '@/lib/team/library-types';
import type { ProjectAnswers } from '@/lib/team/answers';
import type { ProjectView } from '@/lib/team/projects';
import { plural } from '@/lib/team/words';
import { readAnswers } from '@/lib/team/actions';
import { AnswersMark, ArchiveMark, DueMark, SearchMark } from './icons';
import NewSurveySheet from './sheets/new-survey';
import SurveyMadeSheet from './sheets/survey-made';
import ProjectSheet from './sheets/project';
import AnswersSheet from './sheets/answers';
import InsightsSheet from './sheets/insights';
import PastSheet from './sheets/past';
import SettingsSheet from './sheets/settings';
import Toolbar from './toolbar';
import Toast, { useToast } from './toast';

type Panel = 'new' | 'past' | 'settings' | null;

export default function Today({
  user,
  live,
  archived,
  library,
  origin,
  signOut,
}: {
  /** who this browser is signed in as — read in Settings, and nowhere else */
  user: { name: string | null; email: string | null };
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
   * The headline never changes — 20 August 2026, asked for, drawn in the mock.
   *
   * It said "Two things need you this morning" or "Nothing needs you right
   * now", which made the top of the page a status report that read differently
   * every week. It is an invitation now, and it sits directly above the button
   * that accepts it.
   *
   * PRODUCT.md principle 2 — an empty screen is success — is not lost with it.
   * It moves to the bell, which says "Nothing is waiting" and carries no badge
   * when there is nothing to carry. The principle was never about the greeting;
   * it was about not manufacturing activity to fill space, and a page that says
   * the same calm thing every morning is that principle rather than a casualty
   * of it.
   */
  const [query, setQuery] = useState('');

  /**
   * Search filters the live projects by client name, here in the browser.
   *
   * A studio running three projects a month has ten of these, and ten rows are
   * already on the page — so this is a filter over what is loaded rather than a
   * query, and it costs no request and cannot be slow. `toLocaleLowerCase` and
   * not `toLowerCase`, because these names are Thai as often as not and the
   * locale-aware form is the one that does not surprise.
   */
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (p) =>
        p.clientName.toLocaleLowerCase().includes(q) ||
        p.packageLabel.toLocaleLowerCase().includes(q),
    );
  }, [ordered, query]);

  return (
    /**
     * The page's ground is the parchment again — 20 August 2026.
     *
     * `.deck.paper` inverted it on 19 August: the page went white and cards
     * became the tone, so that opening a project did not flip the relationship
     * under the reader. That was right for a page which *was* a stack of cards.
     *
     * It is not one now. The page is a hero on the ground with a white sheet
     * rising over it, and under `.paper` that sheet would be the same white as
     * everything behind it — a surface with nothing to be raised above. The
     * ground steps back to the parchment, the projects sheet takes the white,
     * and the cards on it take the tone.
     *
     * The modal sheets are unaffected: every one of them passes
     * `surface="paper"` for itself, so opening a project still lands on white.
     */
    <div className="deck">
      <Toolbar
        needs={needs}
        onOpenProject={(id) => setOpenProject(id)}
        onSettings={() => setPanel('settings')}
      />

      {/**
       * The hero, and it does not move.
       *
       * `position: sticky` at the top with the projects sheet riding over it —
       * asked for: "when the user scrolls down the All projects sheet will go
       * up and cover the whole screen." The sheet is what scrolls; this stays
       * where it is and is covered.
       *
       * It is the whole of the page's first screen: what this is, what it is
       * for today, and the one thing to press.
       */}
      <section className="hero">
        {/* The product name was here, over the question. It is in the toolbar
            beside the mark from 20 August 2026 — asked for, and it takes a
            kicker off the hero on the way: the name is identity, and identity
            belongs in the identity slot rather than stacked above a heading. */}
        <h1 className="heroask">Start a new project?</h1>
        {/**
         * What pressing the button actually does, in the two facts the sheet
         * will ask for.
         *
         * It says "you get one link to send" rather than "we'll send it",
         * because the platform sends nothing, ever — CLAUDE.md is explicit that
         * getting the link to the client is manual and there is no email from
         * here. A hero that implied otherwise would be the one sentence on the
         * page that the product cannot keep.
         */}
        <p className="herosub">Pick a package and a date. You get one link to send.</p>
        {/* "New project", not "New survey" — 20 August 2026, asked for.
            What the press creates is a client, a project and the survey on it,
            in one transaction, and the headline above it asks about the
            project. The sheet it opens is named to match. The word *survey*
            still means the questionnaire everywhere else, which is the point of
            moving it off this button: it was naming the part rather than the
            thing being made. */}
        <button className="btn btn-primary herocta" onClick={() => setPanel('new')}>
          New project
        </button>
      </section>

      {/**
       * The projects sheet.
       *
       * A white surface on the page's own ground, inset from both edges and
       * rounded at the top only, that rises over the hero as the page scrolls
       * and fills the window. Its `min-height` is what lets it cover: without
       * one, a studio with two projects has a sheet 400px tall and the hero
       * never leaves.
       */}
      <section className="projsheet">
        <div className="pshead">
          <h2>All projects</h2>
          <div className="pstools">
            {/**
             * Search, over what is already loaded.
             *
             * `type="search"` for the clear affordance the browser draws and
             * for the announcement; a real `<label>`, hidden, because a
             * placeholder is not a label — it leaves when you type, and it is
             * the thing a reader needs when the field has content in it.
             */}
            <span className="pssearch">
              <SearchMark />
              <label className="vh" htmlFor="projsearch">
                Search projects by client or package
              </label>
              <input
                id="projsearch"
                type="search"
                className="input"
                placeholder="search project"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </span>
            {/* Archived. It was behind the toolbar's More menu; it belongs
                beside the list it is the other half of. */}
            <button
              className="iconbtn"
              aria-label={`Archived projects — ${archived.length}`}
              title="Archived projects"
              onClick={() => setPanel('past')}
            >
              <ArchiveMark />
            </button>
          </div>
        </div>

        {/**
         * The grid.
         *
         * A card per project, ordered with the ones that need somebody first.
         * The card's body is **who answered** — this product's whole subject is
         * the answers arriving, and a name is worth more than the digit beside
         * it, especially since PRODUCT.md records that one respondent is the
         * normal case rather than the degenerate one.
         *
         * Everything here is text. There is no imagery in this product — no
         * logos, no thumbnails, nothing to put in a tile — so a card that is
         * not filled with real content is a loading skeleton with a name on it.
         */}
        {live.length === 0 ? (
          <p className="psnone">
            No projects yet. Create the first survey when a deal is signed.
          </p>
        ) : shown.length === 0 ? (
          <p className="psnone">
            Nothing matches &ldquo;{query.trim()}&rdquo;. {plural(live.length, 'project')} running.
          </p>
        ) : (
          <ul className="pgrid">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  className="pcard"
                  type="button"
                  /**
                   * Named outright rather than left to be computed.
                   *
                   * The card's text is a name, a package, a list of people and
                   * a sentence, across half a dozen elements — and how a
                   * browser joins those into one announced string is not
                   * something to find out from a client. The mark is drawn with
                   * no text at all, so this is the only place a reader is told
                   * the project needs somebody.
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
                  {/**
                   * The mark, on the cards with something waiting.
                   *
                   * A child of the card, not of the name — 20 August 2026. It
                   * hung in the name's left margin, which worked until the name
                   * was clamped to two lines: `-webkit-line-clamp` needs
                   * `overflow: hidden`, and the dot was outside that box, so it
                   * was still in the DOM and invisible on every card.
                   *
                   * The card's own top-trailing corner instead. It is out of
                   * the text flow, so it cannot be clipped and it does not
                   * indent a name that most cards do not have a dot beside —
                   * every client name in the grid starts on the same vertical,
                   * which was the point of the margin in the first place.
                   *
                   * Its legend is the notification panel, which names the same
                   * projects in sentences — a bare glyph needs one.
                   */}
                  {p.action && <i className="pmark" aria-hidden="true" />}
                  <span className="pcname">{p.clientName}</span>
                  <span className="pcpkg">{p.packageLabel}</span>

                  {/**
                   * The respondents' names were the card's body until
                   * 20 August 2026, and they are gone — asked for, so that every
                   * card looks the same.
                   *
                   * They were the reason the card was tall, and they were worth
                   * it one card at a time: this product's subject is answers
                   * arriving, and a name says more than the digit beside it. In
                   * a grid they were the opposite. One project showed four
                   * names, its neighbour said "Waiting for the first answer",
                   * and a third showed one — so eight tiles of the same size
                   * held wildly different amounts of ink, and the grid read as
                   * broken rather than as varied. Consistency is what a grid is
                   * *for*; a list is where things are allowed to differ.
                   *
                   * Nothing is lost that is more than one press away: the
                   * project sheet lists every respondent with the date each
                   * answered, which is the fuller version of this and always
                   * was. The count and the recency stay on the card below.
                   */}

                  {/* Two facts, each with its mark: what has come back, and
                      when the door shuts. They were two grey sentences stacked
                      on a tile, which is the one place in this app where a
                      glyph earns its place — a card is scanned, not read, and
                      at a glance the mark is what separates the two lines. */}
                  <span className="pcstate">
                    <span className="pcline">
                      <AnswersMark />
                      <span>{p.standing.arrived}</span>
                    </span>
                    {p.standing.due && (
                      <span className="pcline">
                        <DueMark />
                        <span>{p.standing.due}</span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
      {panel === 'settings' && (
        <SettingsSheet
          name={user.name}
          email={user.email}
          signOut={signOut}
          onClose={() => setPanel(null)}
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
