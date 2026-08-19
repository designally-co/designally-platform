'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  answerPreview,
  isAnswered,
  looksLikeEmail,
  suggestEmailFix,
  type DraftValues,
} from '@/lib/survey/answers';
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
  /**
   * Whether the identity step has been pressed past with something blank.
   *
   * It was `nameMissing`, set only by `submit` — so the three fields were
   * optional right up to the last screen, and a respondent who skipped them
   * was thrown back twenty slides at the moment they tried to send.
   *
   * They are required to leave the step now (19 August 2026, asked for). Who is
   * speaking is not one of the twenty-one questions; it is the frame the
   * answers hang on, and the analysis reads it. Gating it here is also what
   * lets the send screen stop listing the three of them.
   */
  const [identityMissing, setIdentityMissing] = useState(false);
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
  /**
   * The count is **screens**, and the welcome says the same number.
   *
   * It counted questions for an hour on 19 August 2026, to settle a real
   * contradiction — the welcome promised twenty-one and the disc ran to nine —
   * and the fix was made on the wrong side. A screen holds two or three
   * questions and a screen is what a client moves through: one heading, one
   * Continue, one thing to think about. That is the unit the disc measures, so
   * it is the unit the welcome names.
   *
   * The identity card returns null: it is outside the count entirely.
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
  /**
   * Forward, unless this is the identity step and something on it is blank.
   *
   * The rest of the questionnaire lets somebody move past a question and come
   * back — PRODUCT.md is explicit that no question is gated, and the send is
   * the wall. These three are not questions: they are who is answering, and a
   * response without them cannot be attributed or followed up.
   *
   * It refuses rather than disabling the button. A disabled Continue with three
   * empty boxes says nothing about which one it is waiting for; pressing it
   * marks every blank field and leaves the reason under the field it belongs
   * to.
   */
  /**
   * Is this identity field good enough to leave the step on?
   *
   * Filled, and — for the one that says it is an email — shaped like one.
   * `abcd` in the email box passed every check the survey had: the field is
   * `type="email"`, which buys the `@` keyboard on a phone and nothing else,
   * because React submits this and no native form validation ever runs.
   *
   * The same rule the submit route applies, so a client cannot be told the
   * address is fine and then have the server disagree.
   */
  const identityOk = (q: SurveyQuestion, v: DraftValues) => {
    if (!isAnswered(q.type, v[q.ref])) return false;
    if (q.config.maps_to !== 'email') return true;
    const raw = String(v[q.ref] ?? '');
    /* Shaped like an address, and not at one of the domains where an address
       cannot exist. `gmail.co` is well formed and still nobody's mailbox, so
       the format rule alone let it past — see `TYPO_DOMAINS`. */
    return looksLikeEmail(raw) && !suggestEmailFix(raw);
  };

  const advance = (n: number) => {
    /* read from `cards` rather than the `card` binding, which is declared
       further down — this keeps the guard next to the movement it guards */
    const leaving = n > WELCOME ? cards[n - 1] : undefined;
    if (leaving?.kind === 'fields' && leaving.questions.some((q) => !identityOk(q, values))) {
      setIdentityMissing(true);
      return;
    }
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
  /* The email is read off `values` by the submit route, not here — the pair of
     locals that held it were only ever for the send screen's `<dl>`, which is
     gone. `respondentName` stays: `submit` guards on it and the thank-you
     screen is greeted with it. */
  const respondentName =
    nameQuestion && typeof values[nameQuestion.ref] === 'string'
      ? (values[nameQuestion.ref] as string).trim()
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
    /* Numbered questions only. The identity fields were here because they could
       block a send without appearing anywhere else; they cannot be blank by the
       time this screen is reachable, so listing them was showing somebody three
       answers they had just been required to give.

       **The index comes from `cards`, not from the filtered list.** `step` is
       what each row navigates back to, so dropping the identity card before
       numbering would shift every question back by one and send every row to
       the question before its own. */
    return cards
      .map((c, i) => ({ card: c, i }))
      .filter(({ card: c }) => c.kind !== 'fields')
      .flatMap(({ card: c, i }) =>
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
  const answered = survey.questionCount - numberedBlanks.length;

  /* numbered questions only — name and email are not numbered anywhere else */

  async function submit() {
    /* the button is disabled while anything is blank; this is the second door,
       in case a draft restores into a state the button was not re-rendered for */
    if (blanks.length > 0) return;
    /* Belt and braces: the identity step cannot be left blank any more, but a
       draft restored from an older version can still arrive here without a
       name. */
    if (!respondentName) {
      setIdentityMissing(true);
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
    setIdentityMissing(false);
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
   * Two to four are open at once, so "15 of 21" over a screen holding 15, 16
   * and 17 is the position of the screen's *first* question wearing the look of
   * a position in the questionnaire. A screen is what a client moves through,
   * each one has a heading naming what it covers, and the disc counts those.
   *
   * Null on the identity card, which is outside the count entirely.
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
          {/* The Point, empty — the same as the send screen. It read `9/9`, a
              full count on a screen where there is nothing left to count. */}
          <Rail n={0} total={counts.total} />
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
          {/* Nothing in it but the Cut and its Point — 19 August 2026, asked
              for. It carried "All 21 answered" over a `9/9` disc: two counts of
              the same finished thing, on the one screen where the number is
              behind the reader rather than in front of them. The Cut arriving
              full is the ending, and the line under this says thank you by
              name. */}
          <Masthead counted={false} count={{ n: 0, total: counts.total }} />
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
                 * What replaced it, 19 August 2026, is warmth rather than a
                 * promise. "Thank you, X." on its own was the whole screen and
                 * read as a receipt — the client had just spent twenty minutes
                 * on twenty-one questions and the last thing the survey said to
                 * them was four words. This line says the two things that are
                 * both true and worth hearing: the answers arrived, and a
                 * person reads them. It promises no meeting and no date.
                 */}
                <h1>
                  Thank you, <em>{submitted}</em>.
                </h1>
                <p className="intro">
                  Your answers are with us. We&rsquo;ll read every one before we
                  start designing.
                  <span className="th">คำตอบของคุณส่งถึงเราแล้ว เราจะอ่านทุกข้อก่อนเริ่มออกแบบ</span>
                </p>
              </div>
              <button className="btn btn-quiet start" onClick={answerAsSomeoneElse}>
                {/* "Answer as another stakeholder" until 19 August 2026. It was
                    the team's word for the person, not the person's own — and
                    the client reading it has just finished answering and is
                    being asked whether somebody else at their company should
                    too. This says the thing that happens. */}
                Submit another answer
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
        <div
          className="survey-shell client-surface sendshell"
          data-blocked={numberedBlanks.length > 0 ? '' : undefined}
        >
          {/* The Point, empty. What is still blank is the list's job, and it
              read `9/9` — a full count on the one screen where the count is not
              the question, beside a line that was already saying how many were
              answered. The disc stays because it is the head of the Cut; only
              the number goes. */}
          <Rail n={0} total={counts.total} />
          {/**
           * The same masthead the questions carry — 19 August 2026, asked for.
           *
           * "Ready to send" and the count were an `<h2>` and a `<p>` inside the
           * slide, so this was the one screen in the run whose title scrolled
           * with its content and sat under the Cut rather than on it. As a
           * masthead they behave like every other screen's: the words hold the
           * top, the Cut closes them, and the disc sits on that line beside
           * them.
           *
           * The count takes the eyebrow and the title takes the heading, which
           * is the shape the questions already use — a small label over a short
           * line. The disc is empty because there is nothing left to count.
           */}
          <Masthead
            counted
            count={{ n: 0, total: counts.total }}
            section={{ en: `${answered}/${survey.questionCount} answered` }}
            heading={{ en: 'Ready to send' }}
          />
          <div className="slide sendslide" data-active="" data-dir={dir}>
            <div className="slidebody">
              <div className="slidemain">
                {/**
                 * One count, and it changes rather than repeating itself.
                 *
                 * There were two: "0 of 21 answered" over "21 questions still
                 * need an answer before you can send" — the same arithmetic
                 * twice, in both languages, which is four lines saying one
                 * thing. The second is the useful one while anything is blank
                 * because it says what *stops the send*, and it disappeared at
                 * zero blanks, which is why the first existed at all.
                 *
                 * So it is one line that knows both states: what is missing
                 * while something is, and that nothing is once nothing is.
                 */}

                {/* *Sending as* and *We'll reach you at* were here, echoing the
                    name and the email back before the send. They went on
                    19 August 2026: the review list below already carries both,
                    with the whole questionnaire, and each row is a button back
                    to its own field. The `<dl>` said the same two things a
                    second time and could only be read, not acted on.

                    What it was for still holds — a forwarded link can be
                    answered as the wrong person, and this is the last screen
                    where that can be caught. The list is where it is caught
                    now, and better: it shows the answer *and* the way back to
                    change it. */}



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
                        {/* Three items, not two: the number is its own column
                            so a wrapped question keeps its indent instead of
                            running back under the numeral, and the answer lines
                            up with the question rather than with the number.
                            See `.qanda button`. */}
                        {r.number !== null && <span className="qa-n">{r.number}</span>}
                        <span className="qa-q">
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
            /**
             * Both practical facts, on one bilingual pair — 19 August 2026.
             *
             * The count and the time were here; the date was a separate block
             * in the body. They are the same kind of thing — what somebody
             * weighs before committing twenty minutes — and split across the
             * screen they cost **six lines** of metadata in two languages
             * before the button, with the smallest type on the page sitting
             * above the headline.
             *
             * One pair now: how long, and by when, in each language, as the
             * masthead's own line. Four lines of meta become two, the body is
             * headline → reassurance → action, and the date is still the last
             * fact read before Start on a phone because the masthead is the
             * thing directly above it there.
             *
             * **The Thai stays.** Dropping it was considered and is what
             * PRODUCT.md principle 6 exists to stop: every client-facing line
             * carries both languages, buttons excepted, and this is the first
             * screen a Thai-only stakeholder ever sees. A shorter screen is
             * worth having; a screen they cannot read is not.
             */
            lead={
              /* Each fact is `nowrap`, so a narrow column breaks between them
                 and never inside one. Left to itself the Thai split as
                 "ตอบภายใน 2 / กันยายน" — a language breaking in the middle of
                 its own phrase, which is the same defect that put the Thai on
                 its own line under `.intro`. */
              <span className="qwhen">
                {/* Steps, not questions — 19 August 2026. This said
                    "21 questions" while the disc beside it counted screens and
                    ran to nine, so a client was given one number and then
                    watched a different one for twenty minutes.

                    The disc measures screens, because a screen is what somebody
                    moves through: one heading, one Continue, one thing to think
                    about. So the promise is in the same unit, and `counts.total`
                    is the same figure the disc's denominator uses rather than a
                    second count that could drift from it.

                    What it costs: the client is no longer told how many
                    questions there are. "About 20 minutes" is what they were
                    weighing anyway, and the twenty-one are still counted where
                    it matters — the send screen's `0/21 answered`, which is
                    attached to the button that is blocked until they are all
                    done. */}
                <b>
                  {counts.total} step{counts.total === 1 ? '' : 's'}
                </b>{' '}
                · <b>about 20 minutes</b>
                {/* Its own line, not a third fact after a middot: how long it
                    takes and when it is wanted by are two different questions,
                    and run together they wrapped wherever the column ended. */}
                {survey.dueOn && <span className="qby">Answer by {survey.dueOn.en}</span>}
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
                        {/* Names the field and stops. It said "Please tell us
                            your name so we know whose perspective this is",
                            which is three lines on a phone explaining a rule to
                            somebody who has already met it — and the reason
                            belongs to the screen, not to the error. Built from
                            the question's own label so all three read the same
                            and none of them is written twice. */}
                        {/* Two things can be wrong with this row and they get
                            different sentences: nothing typed, or something
                            typed that is not an address. "Please fill in your
                            email" under a box holding `abcd` reads as a bug —
                            it is filled in. */}
                        {/* Three things can be wrong with this row and each
                            gets its own sentence. Nothing typed; something
                            typed that is not an address; or an address at a
                            domain nobody has a mailbox at — that last one is
                            not "invalid", it is a letter out, and the fix is
                            already on screen as the button underneath, so this
                            says look rather than repeating it. */}
                        {identityMissing && !identityOk(q, values) && (
                          <span className="qwarn">
                            {!isAnswered(q.type, values[q.ref])
                              ? `Please fill in ${q.textEn.toLowerCase()}. · กรุณากรอก${q.textTh}`
                              : suggestEmailFix(String(values[q.ref] ?? ''))
                                ? 'Please check the email address. · กรุณาตรวจสอบอีเมลอีกครั้ง'
                                : 'Please enter a valid email address. · กรุณากรอกอีเมลให้ถูกต้อง'}
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
                {/**
                 * Whose project this is — 19 August 2026, asked for.
                 *
                 * It is the first thing a client checks: somebody forwarded
                 * them a link and they want to know it was meant for them. It
                 * went in the masthead first, with the count and the date, and
                 * came out again the same day — the masthead is the meta block
                 * and this is not meta, it is who the next twenty minutes are
                 * about. In the body it is the line the headline speaks from.
                 *
                 * Not inside the headline the way the closed screen carries it:
                 * that one *states* something about the project, and this one
                 * is an invitation with the project as its context.
                 */}
                <p className="qproj">{survey.clientName}</p>
                <h1>Let&apos;s shape your brand, together.</h1>
                {/**
                 * The sentence that says what the questionnaire is for.
                 *
                 * It was cut in August down to "There are no wrong answers", on
                 * the argument that a client who followed a link from their own
                 * project lead already knows why they are here and the headline
                 * says the rest. Asked back on 19 August 2026: the reassurance
                 * is the smaller point, and the screen was left saying nothing
                 * about what the twenty minutes are *for*.
                 *
                 * **Without the kick-off.** The original ran a second line —
                 * "We'll bring every perspective together and see you at the
                 * kick-off" — and the kick-off went on 17 August 2026 with the
                 * stage meter and the decisions table. The platform stops at
                 * the summary and promises no meeting, so neither does this.
                 */}
                <p className="intro">
                  It helps us understand your brand before we start designing.
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
              {/* "Your answers were saved on this device" was here, under the
                  button, whenever a draft existed. It went on 19 August 2026:
                  the button already says *Continue* rather than *Start*, which
                  is the same fact in the place somebody is looking, and a line
                  explaining the saving to a client who never asked about it is
                  the product talking about itself. Nothing is lost — the draft
                  behaves the same, and the failure case still says where the
                  answers are, because there it is the reason to try again. */}
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
