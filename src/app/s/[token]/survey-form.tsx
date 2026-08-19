'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { answerPreview, isAnswered, type DraftValues } from '@/lib/survey/answers';
import type { SurveyPayload, SurveyQuestion, SurveyStep } from '@/lib/survey/load';
import Chevron from '../../chevron';
import Rail from './rail';
import { LangContext, type Lang } from './lang';
import Question, { IdentityField, Masthead, type ValueUpdate } from './questions';

const WELCOME = 0;

function draftStorageKey(token: string) {
  return `designally.draft.${token}`;
}

/**
 * English leads, and Thai is one tap away on every question.
 *
 * There was a chooser on the welcome slide. It asked the respondent to make a
 * decision before they had seen a single question, on a screen whose whole job
 * is to get them started — and it was the only control competing with Start.
 * The per-question reveal already does the work, so the choice is made where it
 * is actually felt rather than up front.
 */
const LEAD: Lang = 'en';

type StoredDraft = {
  draftKey: string;
  step: number;
  values: DraftValues;
  updatedAt: number;
};

function newDraftKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Whether a conditional step is showing yet. The trigger is declared in
 * seed/question-blocks.json as `triggers` on a choice — never inferred from the
 * wording of an answer.
 */
function stepIsVisible(step: SurveyStep, values: DraftValues, all: SurveyStep[]) {
  if (!step.revealedBy) return true;

  const source = all.flatMap((s) => s.questions).find((q) => q.ref === step.revealedBy);
  if (!source) return false;

  const triggers = source.config.triggers ?? {};
  const wanted = Object.entries(triggers)
    .filter(([, block]) => step.questions.some((q) => q.blockKey === block))
    .map(([choice]) => choice);

  const answer = values[step.revealedBy];
  if (!answer || typeof answer !== 'object') return false;
  if ('choices' in answer) return answer.choices.some((c) => wanted.includes(c));
  if ('choice' in answer) return wanted.includes(answer.choice);
  return false;
}

/**
 * One screen.
 *
 * The identity block is the one screen holding more than a single question,
 * because a name is not numbered and never stood alone.
 *
 * **The personality battery is no longer split.** Ten scale pairs were dealt
 * across three screens, then four, because a screen taller than the viewport
 * could not be rested inside a mandatory-snap deck — its bottom was literally
 * unreachable. The deck is gone and a long question is a long page, so the
 * battery is one question again, which is what it is: ten readings of the same
 * thing, answered against each other.
 */
type Section = { en?: string; th?: string };

type Card =
  | { kind: 'fields'; questions: SurveyQuestion[]; section: Section; headingEn: string; descTh?: string }
  | {
      kind: 'group';
      questions: SurveyQuestion[];
      section: Section;
      headingEn: string;
      descTh?: string;
    };

/**
 * The way back to the send screen, parked 17 August 2026.
 *
 * It is moving somewhere else and is hidden until it lands — not deleted,
 * because `fromSend` and `openSend` are the machinery it needs and both are
 * still here, so putting it back is flipping this. The masthead's rules for it
 * are still in `globals.css` and inert without it.
 */
const SHOW_BACK_TO_SEND = false;


export default function SurveyForm({ survey }: { survey: SurveyPayload }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(WELCOME);
  const [values, setValues] = useState<DraftValues>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameMissing, setNameMissing] = useState(false);
  /** Whether the send screen is showing rather than a question. */
  const [sending, setSending] = useState(false);
  /**
   * Whether the questions were reached from the send screen.
   *
   * Jumping back to a blank question left the send screen twenty slides away,
   * reachable only by pressing Continue through every question in between. The
   * review is a hub, so while somebody is out on a spoke there is a way
   * straight back to it. It clears the moment they use it or arrive by any
   * other route.
   */
  const [fromSend, setFromSend] = useState(false);
  /**
   * Where Continue on the welcome screen goes for somebody coming back.
   *
   * The draft has always recorded which question they were on; nothing read it,
   * because a returning respondent could simply scroll to where they had got
   * to. They cannot now — without this, resuming a half-finished survey means
   * pressing Continue past every question already answered.
   */
  const [resumeAt, setResumeAt] = useState(1);
  /**
   * Which way the survey just moved, so the next screen can arrive from there.
   *
   * Every caller states its own direction rather than it being inferred from
   * the step numbers, because the numbers lie: leaving the send screen to fix a
   * blank is a step *backwards* even when the question is number 3 and you came
   * from number 21.
   */
  const [dir, setDir] = useState<'next' | 'back'>('next');

  const draftKey = useRef<string>('');
  const storageKey = draftStorageKey(survey.token);

  const steps = useMemo(
    () => survey.steps.filter((s) => stepIsVisible(s, values, survey.steps)),
    [survey.steps, values],
  );

  /**
   * One card per step. The step *is* the screen.
   *
   * This used to split every step into a card per question, which is why the
   * survey ran to twenty-one screens. The branding team asked for two to four
   * questions together, and the grouping already existed — `steps.ts` has
   * always defined thematic groups with their own headings, and the split threw
   * that structure away on the way to the screen.
   *
   * The unnumbered short-text run (the identity block) keeps its own kind,
   * because it is laid out as a compact field grid rather than as questions.
   */
  const cards = useMemo(
    () =>
      steps.map((s): Card => {
        const section: Section = { en: s.sectionEn, th: s.sectionTh };
        const allFields = s.questions.every((q) => q.type === 'short_text' && q.number === null);
        return allFields
          ? { kind: 'fields', questions: s.questions, section, headingEn: s.headingEn, descTh: s.descTh }
          : {
              kind: 'group',
              questions: s.questions,
              section,
              headingEn: s.headingEn,
              descTh: s.descTh,
            };
      }),
    [steps],
  );

  /* the last question; past it is the send screen */
  const LAST = cards.length;

  /**
   * Where each card sits in the count the client is shown — and which cards are
   * not in it at all.
   *
   * The identity card is not. Name, position and email are what you give before
   * the questionnaire starts, not the first sixth of it, and counting them meant
   * the Cut had already advanced on a screen where nothing had been answered.
   * Asked for 17 August 2026; the count now begins at the first question, and
   * the identity screen carries the Cut at rest.
   *
   * Keyed on the card being a field grid rather than on it being the first one,
   * because that is the actual property: a screen of unnumbered short-text
   * fields is not a question, wherever it lands.
   */
  const counts = useMemo(() => {
    let n = 0;
    const position = cards.map((c) => (c.kind === 'fields' ? null : ++n));
    return { position, total: n };
  }, [cards]);

  /* ── restore ────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      let local: StoredDraft | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) local = JSON.parse(raw) as StoredDraft;
      } catch {
        local = null;
      }

      draftKey.current = local?.draftKey ?? newDraftKey();

      // The server copy is the backup for a cleared browser or a second device.
      let remote: { step: number; values: DraftValues; updatedAt: number } | null = null;
      try {
        const res = await fetch(
          `/api/s/${survey.token}/draft?key=${encodeURIComponent(draftKey.current)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const body = await res.json();
          if (body.draft) remote = body.draft;
        }
      } catch {
        // offline is fine — the local copy is authoritative for this device
      }

      if (cancelled) return;

      const winner =
        local && remote ? (remote.updatedAt > local.updatedAt ? remote : local) : (local ?? remote);

      if (winner) {
        setValues(winner.values ?? {});
        setSavedAt(winner.updatedAt ?? null);
        setResumeAt(winner.step ?? 1);
      }
      setReady(true);
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [storageKey, survey.token]);

  /* ── save ───────────────────────────────────────────────────────── */

  const persistLocal = useCallback(
    (nextStep: number, nextValues: DraftValues) => {
      const payload: StoredDraft = {
        draftKey: draftKey.current,
        step: nextStep,
        values: nextValues,
        updatedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // a full or blocked storage must not stop somebody answering
      }
      return payload;
    },
    [storageKey],
  );

  const persistServer = useCallback(
    async (nextStep: number, nextValues: DraftValues) => {
      try {
        const res = await fetch(`/api/s/${survey.token}/draft`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: draftKey.current, step: nextStep, values: nextValues }),
        });
        if (res.ok) setSavedAt(Date.now());
      } catch {
        // keep going; localStorage already has it
      }
    },
    [survey.token],
  );

  const started = Object.keys(values).length > 0;

  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready || submitted || !started) return;
    persistLocal(step, values);
    if (serverTimer.current) clearTimeout(serverTimer.current);
    serverTimer.current = setTimeout(() => void persistServer(step, values), 2500);
    return () => {
      if (serverTimer.current) clearTimeout(serverTimer.current);
    };
  }, [ready, submitted, started, step, values, persistLocal, persistServer]);

  const setValue = (ref: string, value: ValueUpdate) =>
    setValues((prev) => ({
      ...prev,
      [ref]: typeof value === 'function' ? value(prev[ref]) : value,
    }));

  /* ── one question at a time ──────────────────────────────────────── */

  /**
   * Scrolling used to be the navigation: 25 slides in a `scroll-snap` container,
   * one viewport tall each, and the active one read back off the scroll
   * position. It is now one question rendered at a time and a `step` that says
   * which — and the page scrolls the way a page does.
   *
   * That was not a preference. Nearly every hard defect on this surface came
   * from navigation being a *scroll container*:
   *
   *   · `scroll-snap-type: mandatory` means the scroller must come to rest on a
   *     snap point, and a slide's only snap point is its top — so any question
   *     taller than the screen sprang back and its bottom could not be reached.
   *     Eight of them did at the height a real Safari leaves.
   *   · A `position: fixed` element inside a scroller is attached to that
   *     scroller's compositing layer, so the blur ramp — a sibling of the deck —
   *     composited over the controls and blurred them on iOS. No z-index can
   *     reach across that.
   *   · The send screen had to be lifted out of the deck for the first reason,
   *     and then the thank-you screen's only action turned out to be invisible,
   *     because the floor controls are revealed by an attribute the deck sets
   *     from scroll position.
   *   · Returning to a question meant restoring a scroll offset, which was being
   *     computed from `offsetTop` against the wrong element and silently
   *     corrected by the snap.
   *
   * All four are properties of the container, not of the design. A question
   * longer than the screen is now simply a longer page.
   */
  /**
   * The keyboard measurement is gone.
   *
   * `--kb` existed so the floor controls could ride above the phone keyboard.
   * The controls are in the flow under the questions from 17 August 2026, so
   * the keyboard pushes the page rather than covering a fixed bar, and two
   * `visualViewport` listeners running on every keystroke went with it.
   */

  /**
   * Every view starts at its own top.
   *
   * Called from the handler rather than only from an effect, and both are
   * needed. The effect below is what actually catches every route into a new
   * screen — the review rows, the keyboard, the back control. This runs first,
   * inside the tap that caused the move, which is the only moment iOS Safari
   * reliably lets a page scroll itself: after the gesture ends it will restore
   * the position it thinks the document had, and a screen you have already
   * scrolled through opens halfway down.
   *
   * `scrollingElement` as well as the window, because the two disagree on iOS
   * when the visual viewport is offset by the keyboard, which it is every time
   * a client presses Continue from inside a text box.
   *
   * Nothing here restores a scroll position: a screen is a page, and a new page
   * begins at the beginning.
   */
  const toTop = useCallback(() => {
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  }, []);

  /* the questions end at the last card; past it is the send screen */
  const advance = (n: number) => {
    toTop();
    return n >= cards.length ? openSend() : setStep(n + 1);
  };

  const goTo = useCallback(
    (index: number, direction: 'next' | 'back' = 'next') => {
      toTop();
      setDir(direction);
      setStep(index);
    },
    [toTop],
  );

  const leaveSend = useCallback(
    (index: number) => {
      toTop();
      setDir('back');
      setFromSend(true);
      setSending(false);
      setStep(index);
    },
    [toTop],
  );

  const openSend = useCallback(() => {
    toTop();
    setDir('next');
    setFromSend(false);
    setSending(true);
  }, [toTop]);

  /* the backstop, for every way into a screen that is not one of the four
     handlers above — and for the paint after this one, once the new screen's
     height is known */
  useEffect(() => {
    toTop();
  }, [step, sending, submitted, toTop]);

  /* ── submit ─────────────────────────────────────────────────────── */

  const nameQuestion = survey.steps[0]?.questions[0];
  const emailQuestion = survey.steps[0]?.questions.find((q) => q.config.maps_to === 'email');
  const respondentName =
    nameQuestion && typeof values[nameQuestion.ref] === 'string'
      ? (values[nameQuestion.ref] as string).trim()
      : '';
  const respondentEmail =
    emailQuestion && typeof values[emailQuestion.ref] === 'string'
      ? (values[emailQuestion.ref] as string).trim()
      : '';


  /**
   * Every question and the answer to it, for the last look before sending.
   *
   * Unlike `points`, this includes the identity fields: name, position and
   * email are required, they block sending, and until now a missing *position*
   * blocked it with nothing on the screen saying so — the summary above the
   * list names the other two and has never named that one.
   *
   * A question split over several cards is listed once, pointing at the card it
   * starts on, which is the rule `blanks` and `points` both follow.
   */
  const review = useMemo(() => {
    const seen = new Set<string>();
    return cards.flatMap((c, i) =>
      c.questions
        .filter((q) => !seen.has(q.ref) && seen.add(q.ref))
        .map((q) => ({
          ref: q.ref,
          number: q.number,
          textEn: q.textEn,
          textTh: q.textTh,
          step: i + 1,
          answer: answerPreview(q.type, values[q.ref]),
          answered: isAnswered(q.type, values[q.ref]),
        })),
    );
  }, [cards, values]);

  const blanks = useMemo(() => {
    /* A split battery occupies several cards but is still one question — it is
       listed once, pointing at the slide it starts on. */
    const seen = new Set<string>();
    return cards
      .map((c, i) => ({ card: c, index: i + 1 }))
      .flatMap(({ card, index }) =>
        card.questions
          .filter((q) => q.required && !isAnswered(q.type, values[q.ref]))
          .filter((q) => !seen.has(q.ref) && seen.add(q.ref))
          .map((q) => ({ question: q, index })),
      );
  }, [cards, values]);

  /**
   * The blanks, split the way the screen shows them.
   *
   * `blanks` holds both kinds and is what the send button is gated on, because
   * both kinds are required. But the screen shows them in two different
   * objects: the grid draws one point per *numbered* question, and the three
   * identity fields have no number and no point.
   *
   * Counted together, the sentence above the grid read "24 questions still need
   * an answer" over twenty-one points — a number the client cannot reconcile
   * with anything they can see. Each number on this screen now belongs to
   * something on it.
   */
  const numberedBlanks = blanks.filter(({ question }) => question.number !== null);

  /* numbered questions only — name and email are not numbered anywhere else */
  const answered = survey.questionCount - numberedBlanks.length;

  async function submit() {
    /* the button is disabled while anything is blank; this is the second door,
       in case a draft restores into a state the button was not re-rendered for */
    if (blanks.length > 0) return;
    if (!respondentName) {
      setNameMissing(true);
      leaveSend(1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/s/${survey.token}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: draftKey.current, values }),
      });
      if (!res.ok) throw new Error(await res.text());
      window.localStorage.removeItem(storageKey);
      setSubmitted(respondentName);
    } catch {
      setError(
        'Your answers could not be sent. They are saved on this device — please try again. · ส่งคำตอบไม่สำเร็จ คำตอบยังถูกบันทึกไว้ในเครื่องนี้',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function answerAsSomeoneElse() {
    draftKey.current = newDraftKey();
    setValues({});
    setSubmitted(null);
    setNameMissing(false);
    setSavedAt(null);
    setSending(false);
    setFromSend(false);
    setResumeAt(1);
    setStep(WELCOME);
  }

  /* ── render ─────────────────────────────────────────────────────── */

  /* the welcome is the absence of a card, not a card of its own */
  const card = step > WELCOME ? cards[step - 1] : undefined;

  /**
   * The accordion, resolved for whatever card is on screen.
   *
   * `grouped` is null on a one-question screen — the personality scales are a
   * step of their own, so there is no list and a list's rules around a single
   * item would be two lines bracketing nothing.
   *
   */
  const grouped = card && card.kind === 'group' && card.questions.length > 1 ? card : null;

  /**
   * What the disc counts: **screens, not questions**.
   *
   * It counted questions for a few hours, and that was right only while a
   * screen opened one question at a time — you really were on question 8. All
   * two to four are open again, so "15 of 21" over a screen holding 15, 16 and
   * 17 is the position of the screen's *first* question wearing the look of a
   * position in the questionnaire.
   *
   * A screen is what a client moves through, each one has a heading naming what
   * it covers, and the disc counts those. Null on the identity card, which is
   * outside the count entirely.
   */
  /**
   * Zero, not nothing, before the questions start.
   *
   * The identity card is outside the count and carried no masthead at all — no
   * line, no disc. The mark belongs on every screen, so it reads `0/9` there
   * and on the welcome: honest about where you are, and the brand's object is
   * on the page from the first screen rather than arriving at the second.
   */
  const railAt = card ? (counts.position[step - 1] ?? 0) : 0;

  /* Terminal, so it is tested before every other screen. It was tested after
     `sending`, which is still true when the send succeeds — the answers reached
     the server, the response row was written, and the respondent was left
     looking at the same Ready to send screen with a live button. The obvious
     thing to do next is press it again. */
  if (submitted) {
    return (
      <LangContext.Provider value={LEAD}>
        {/* One Field for the whole questionnaire.
            This screen and the welcome ran on the CI's near-black Field, which
            it reserves for a moment of drama. Twenty-three screens read better
            as one surface than as three: the drama cost a change of ground
            twice in a sitting, and a client who has just answered twenty-one
            questions does not need the page to announce that they finished.
            The Cut and the Wordmark still sign both screens. */}
        <div className="survey-shell client-surface">
          {/* the disc at the end of the run: every screen behind you */}
          <Rail n={counts.total} total={counts.total} />
          {/**
           * The Cut arrives full, and that is the whole ending.
           *
           * This screen used to open with a 52px tick, then say the answers had
           * been received, then say it again in Thai, then explain the button
           * underneath it. Four ways of saying done.
           *
           * The line that measured the questionnaire finishing at its full
           * width says it once, in the brand's own object, and the count in the
           * disc is the same figure the client watched climb for twenty-one
           * screens. The tick went with the sentences.
           *
           * In the masthead rather than on the slide, for the reason the
           * welcome's is: this screen is the other end of the same run, and the
           * disc, the words and the Cut belong in the place the twenty-one
           * screens between them put those three things. The wordmark went with
           * the move — the mark is in the disc, and a screen carrying it twice
           * is saying the name to somebody who has just spent twenty minutes
           * with it.
           */}
          <Masthead
            counted={false}
            count={{ n: counts.total, total: counts.total }}
            lead={
              /* The questions, not the screens. The disc counts screens, as
                 it has on all nine of them — but the client was told twenty-one
                 questions on the welcome, so "9/9" beside a bare "Answered"
                 reads as nine of the twenty-one they were promised. The Thai is
                 the string this screen already carried; it says answered in
                 full and needs no number to do it. */
              <span className="qwhen">
                All {survey.questionCount} answered
                <span className="th">ตอบครบแล้ว</span>
              </span>
            }
          />
          {/* the floor controls are revealed by data-active, and there is only
              ever one screen — without it the only action here was invisible */}
          <div className="slide" data-screen="done" data-active="" data-dir="next">
            <div className="slidebody">
              <div className="slidemain">
                {/**
                 * The whole screen, now.
                 *
                 * "See you at the kick-off · แล้วพบกันในการประชุมเริ่มโปรเจกต์"
                 * sat under this and was deleted 17 August 2026 with the
                 * kick-off itself. The platform does not model that meeting any
                 * more — it models a questionnaire and the summary it produces
                 * — so the line was a client-facing promise about something
                 * that had stopped existing, in two languages.
                 *
                 * Nothing replaces it. The masthead says the questionnaire is
                 * complete, this says thank you, and the only thing left to
                 * offer somebody is the link for the next stakeholder. What
                 * happens after the summary is not this surface's to promise.
                 */}
                <h1>
                  Thank you, <em>{submitted}</em>.
                </h1>
              </div>
              <button className="btn btn-quiet start" onClick={answerAsSomeoneElse}>
                Answer as another stakeholder
              </button>
            </div>
          </div>
        </div>
      </LangContext.Provider>
    );
  }

  if (sending) {
    return (
      <LangContext.Provider value={LEAD}>
        <div className="survey-shell client-surface">
          {/* the end of the run: what is still blank is the grid's job, not
              the disc's */}
          <Rail n={counts.total} total={counts.total} />
          <div className="slide sendslide" data-active="" data-dir={dir}>
            <div className="slidebody">
              <div className="slidemain">
                <h2>Ready to send</h2>
                <p className="intro">
                  {answered} of {survey.questionCount} answered
                </p>
                <p className="introth th">
                  ตอบแล้ว {answered} จาก {survey.questionCount} ข้อ
                </p>

                {/* The link is forwardable, so somebody can reach this screen
                    having answered as the wrong person. This is the last place
                    it can be caught, and the only place it is shown. */}
                <dl className="sendwho">
                  <div>
                    <dt>Sending as · ส่งในชื่อ</dt>
                    <dd className={respondentName ? undefined : 'missing'}>
                      {respondentName || 'not given · ยังไม่ได้กรอก'}
                    </dd>
                  </div>
                  {/* Retired at question version 4. Surveys sent at 3 still
                      carry it, and still show it here (rule 5). */}
                  {emailQuestion && (
                    <div>
                      <dt>We&rsquo;ll reach you at · ติดต่อกลับที่</dt>
                      <dd className={respondentEmail ? undefined : 'missing'}>
                        {respondentEmail || 'not given · ยังไม่ได้กรอก'}
                      </dd>
                    </div>
                  )}
                </dl>

                {numberedBlanks.length > 0 && (
                  <>
                    {/* Every question is required, so this is the wall rather
                        than a note. It is here and not on each question
                        because a respondent who wants to think about one and
                        come back can — they simply cannot leave without it. */}
                    <p className="blankcount blocking">
                      {numberedBlanks.length === 1
                        ? 'One question still needs an answer before you can send.'
                        : `${numberedBlanks.length} questions still need an answer before you can send.`}
                    </p>
                    <p className="blankcount blocking th">
                      {numberedBlanks.length === 1
                        ? 'ยังเหลืออีก 1 ข้อ ก่อนส่งคำตอบได้'
                        : `ยังเหลืออีก ${numberedBlanks.length} ข้อ ก่อนส่งคำตอบได้`}
                    </p>
                  </>
                )}

                {/**
                 * The last look: every question and what was given for it.
                 *
                 * This screen has shown three things in a day — a list naming
                 * only the blanks, then a grid of points that showed the shape
                 * of the whole thing but none of its content. Neither let a
                 * client *check their answers*, which is the one thing a person
                 * wants on the screen before an irreversible send.
                 *
                 * Every row is a way back to its own question. The identity
                 * fields are in it, so the three things that can block a send
                 * without appearing anywhere else now appear here.
                 */}
                <ul className="qanda">
                  {review.map((r) => (
                    <li key={r.ref} className={r.answered ? undefined : 'blank'}>
                      <button type="button" onClick={() => leaveSend(r.step)}>
                        <span className="qa-q">
                          {r.number !== null && <i>{r.number}</i>}
                          {LEAD === 'th' ? r.textTh || r.textEn : r.textEn}
                        </span>
                        <span className="qa-a">
                          {r.answered ? r.answer : 'Not answered yet · ยังไม่ได้กรอก'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {error && <p className="qwarn">{error}</p>}
              </div>
              {/* the same round arrow as every other back on this survey */}
              <div className="okrow">
                <button
                  className="okback"
                  type="button"
                  onClick={() => leaveSend(LAST)}
                  aria-label="Back to the questions"
                >
                  <Chevron back />
                </button>
                <button
                  className="btn btn-primary ok"
                  onClick={submit}
                  disabled={submitting || blanks.length > 0}
                >
                  {submitting ? 'Sending' : 'Send answers'}
                </button>
              </div>
            </div>
          </div>

          {/* the same ramp the questions' controls sit on — the list runs under it */}
          <div className="floorfade" aria-hidden="true" />
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={LEAD}>
      <div className="survey-shell client-surface">
        {/* the rail is fixed to the viewport, so it belongs to the shell and
            not to any screen — it is the one thing that does not move */}
        {/* `mark` on the welcome alone — the mark is an introduction, and the
            identity screen is past being introduced. See `Disc`. */}
        <Rail n={railAt} total={counts.total} mark={step === WELCOME} />
        {/**
         * The masthead sits here, outside the keyed <section>, and the reason
         * is the Cut.
         *
         * The sticky bar it replaced is gone, so the Cut is the only thing
         * measuring progress and it has to survive a long card — hence pinned.
         * But it also has to *grow*, and that needs this exact position: the
         * section carries `key={step}`, so React tears it down and builds it
         * again on every advance. A freshly mounted element has no previous
         * width to transition from, so inside the section the Cut would jump to
         * its new length rather than run to it. Out here the element persists,
         * only `--cut-progress` changes, and the CI's own `--transition-cut`
         * finally does what it was written for.
         *
         * It is also outside `.slidemain`, so it holds still while the question
         * animates under it.
         */}
        {card && (
          <Masthead
            counted={counts.position[step - 1] !== null}
            count={railAt !== null ? { n: railAt, total: counts.total } : undefined}
            section={card.section}
            /* The identity card takes a heading too. It was withheld because
               name, position and email are not questions — but the screen still
               needs naming, and "About you" over three fields asking who you
               are is the shortest true thing to call it. */
            heading={{ en: card.headingEn, th: card.descTh }}
            /**
             * The way back to the send screen rides in the header.
             *
             * It used to be fixed to the top-right corner of the viewport at
             * z-index 20, which was correct when the survey had no header —
             * there was nothing up there to belong to. There is now, and a
             * floating link painting on top of the masthead read as something
             * that had come loose. In the header it is what it always was: a
             * way out, sitting opposite the count that says where you are.
             */
            action={
              fromSend && SHOW_BACK_TO_SEND ? (
                <button className="toreview" type="button" onClick={openSend}>
                  Back to send
                </button>
              ) : null
            }
          />
        )}

        {/**
         * The welcome wears it too, holding the count instead of a position.
         *
         * "21 · Questions · about 20 minutes" was a block in the middle of the
         * slide with the wordmark above it, which meant the first screen set its
         * head on a different grid from the twenty-one that follow — and the
         * client's eye had to find the subject twice in the first two screens.
         * In the masthead it is where every subsequent screen's subject will be,
         * beside the same disc, and the wordmark is gone: the mark is inside the
         * disc now and the name does not need saying twice on one screen.
         */}
        {!card && (
          <Masthead
            counted={false}
            count={{ n: 0, total: counts.total }}
            /* the mark, on this screen alone — see `Disc` */
            mark
            /* The count is in the sentence, not set as a figure beside it.
               It was `.qfig` at 46-58px — the display treatment the masthead
               used to give a position in the run — which made the first screen
               shout a number the client has no use for yet, and made it the
               only screen whose head was built differently from the rest. It
               reads at the size every other screen's subject reads at. */
            lead={
              <span className="qwhen">
                {survey.questionCount} questions · about 20 minutes
                <span className="th">{survey.questionCount} ข้อ · ประมาณ 20 นาที</span>
              </span>
            }
          />
        )}

        {/* every screen carries a masthead now, including the identity fields,
            so the way back always has a header to sit in — the floating variant
            it used to need is gone */}

        {card ? (
          <section className="slide" data-active="" data-dir={dir} key={step}>
            <div className="slidebody">
              <div className="slidemain">
                {card.kind === 'fields' ? (
                  <div className="identitygrid">
                    {card.questions.map((q) => (
                      <div key={q.ref}>
                        <IdentityField
                          question={q}
                          value={values[q.ref]}
                          onChange={(v) => setValue(q.ref, v)}
                          onEnter={() => advance(step)}
                        />
                        {nameMissing && q.ref === nameQuestion?.ref && (
                          <span className="qwarn">
                            Please tell us your name so we know whose perspective this is. ·
                            กรุณากรอกชื่อของคุณ
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/**
                     * The heading is in the masthead now, beside the count —
                     * see questions.tsx. What is left on the slide is the
                     * questions, which is what a person came here to answer.
                     */}
                    {/**
                     * Every question on the screen, open.
                     *
                     * They folded to one open row for a few hours on 17 August
                     * 2026 and were opened again the same day: a section a
                     * client can see all of is what the branding team asked for
                     * when they asked for two to four questions on a screen,
                     * and a row you have to tap to read is not that.
                     *
                     * What survived the experiment is the list — hairlines
                     * between the questions instead of a 34px void, and every
                     * number hanging in the same 34px column.
                     */}
                    <div className={grouped ? 'qgroup' : 'qgroup solo'}>
                      {card.questions.map((q) => (
                        <div className="qopen" key={q.ref}>
                          <Question
                            question={q}
                            value={values[q.ref]}
                            onChange={(v) => setValue(q.ref, v)}
                            /* Enter leaves the screen: the questions here are
                               read together, and a key that jumped between them
                               would fight the scroll */
                            onEnter={() => advance(step)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Ok onClick={() => advance(step)} onBack={() => goTo(step - 1, 'back')} />
            </div>
          </section>
        ) : (
          <section className="slide" data-screen="welcome" data-active="" data-dir={dir} key="welcome">
            <div className="slidebody">
              <div className="slidemain">
                {/**
                 * The same masthead the questions use, at the start of its run.
                 *
                 * The count and the time were a sentence under the button —
                 * "About 20 minutes · 21 questions" — which is the one fact a
                 * person weighs before committing twenty minutes, set in the
                 * smallest type on the screen. As a figure it is read first,
                 * and the Cut beside it is the same line that will measure the
                 * whole questionnaire, shown here at the length it starts from.
                 *
                 * The Cut runs full here, not short. Nothing has progressed
                 * yet, so a part-drawn line is not "none of twenty-one done" —
                 * it is a rule that failed to finish, which is the same reason
                 * the old progress bar was hidden on this screen rather than
                 * shown at zero. Full, it is simply the Cut, and it starts
                 * measuring on the first question.
                 */}
                {/* The date the team asked for. It is the one thing on this
                    screen that makes somebody answer this week rather than
                    next, so it sits with the count rather than in the small
                    print — and from 18 August 2026 it is a deadline: past it
                    the link stops taking answers and says who to contact. The
                    wording already read as one, which is why it is unchanged. */}
                {survey.dueOn && (
                  <p className="qdue">
                    Please answer by {survey.dueOn.en}
                    <span className="th">กรุณาตอบภายในวันที่ {survey.dueOn.th}</span>
                  </p>
                )}

                <h1>Let&apos;s shape your brand, together.</h1>
                {/**
                 * One line, and it is the only one that had to be here.
                 *
                 * This was a sentence in each language explaining that the
                 * questionnaire helps the team understand the brand before
                 * designing — which is what the headline above it already says,
                 * and what a client who followed a link from their own project
                 * lead already knows. What they do not know, facing twenty-one
                 * questions about their own company, is that they cannot get it
                 * wrong. That is the sentence worth keeping.
                 *
                 * The Thai takes its own line rather than following a middot.
                 * Run together they wrapped mid-phrase — ไม่มีคำตอบ / ที่ผิด —
                 * and a language that breaks in the middle of its own sentence
                 * reads as an afterthought. One block each, same size, same
                 * tone: two languages given the same line, not one queued
                 * behind the other.
                 */}
                <p className="intro">
                  There are no wrong answers
                  <span className="th">ไม่มีคำตอบที่ผิด</span>
                </p>
              </div>

              <button
                className="btn btn-primary start"
                /* clamped here rather than on restore: the card count moves as
                   conditional steps open and close, and a draft saved before the
                   questionnaire was re-sliced can name a step that is now past
                   the end */
                onClick={() => goTo(Math.min(Math.max(resumeAt, 1), cards.length))}
                disabled={!ready}
              >
                {started ? 'Continue' : 'Start'}
              </button>
              {/* only the resume state now — the count and the time moved into
                  the masthead, where they are read rather than skimmed */}
              {started && (
                <p className="takes">
                  Your answers were saved on this device.
                  <span className="th">คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้</span>
                </p>
              )}
            </div>
          </section>
        )}

        {/* The ramp the controls sit on: the page's own colour, fading up to
            nothing, so a long question scrolling past does not collide with
            them. A blur here used to composite over the buttons on iOS because
            they were fixed inside a scroller; there is no scroller now, so that
            constraint is lifted if the blur is ever wanted back. */}
        <div className="floorfade" aria-hidden="true" />


        {savedAt && step > 0 && (
          <p className="savednote" aria-live="polite">
            Saved · บันทึกแล้ว
          </p>
        )}
      </div>
    </LangContext.Provider>
  );
}

/**
 * OK, the shortcut beside it, and — on a phone — the back arrow the reference
 * puts on the floor next to it. On a pointer device the chevron pair in the
 * corner does that job instead, so the arrow here is hidden.
 */
function Ok({
  onClick,
  onBack,
  enterGoes = 'screen',
}: {
  onClick: () => void;
  onBack: () => void;
  /**
   * Where Enter lands from here. Continue always leaves the screen; Enter
   * finishes the screen first, so on a group with questions still to answer
   * the two are not the same act and the hint has to say which is which.
   */
  enterGoes?: 'question' | 'screen';
}) {
  return (
    <div className="okrow">
      <button className="okback" onClick={onBack} type="button" aria-label="Previous question">
        <Chevron back />
      </button>
      <button className="btn btn-primary ok" onClick={onClick}>
        Continue
      </button>
      {/* only what this button does. The paragraph's Shift+Enter now sits under
          the box it belongs to — see questions.tsx. */}
      <span className="okhint">
        {enterGoes === 'question' ? 'Enter goes to the next question' : 'or press Enter'}
      </span>
    </div>
  );
}

/**
 * One chevron, drawn to the reference.
 *
 * It was a 1.6 stroke in a 24 viewBox rendered at 19px — 1.27px on screen,
 * which at a distance reads as a lighter grey than it is set in, because a hair
 * of a line does. It is 2.5px now, across roughly a third of the height of the
 * control it sits in.
 *
 * The arms are at 45 degrees, a right angle between them: 9 wide to 18 tall.
 * They opened to about 100 degrees first, which was an estimate read off a
 * picture; this is the proportion UIKit's own chevron holds, and it is a
 * squarer, less splayed mark.
 */
