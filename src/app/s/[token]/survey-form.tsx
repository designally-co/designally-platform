'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isAnswered, type DraftValues } from '@/lib/survey/answers';
import type { SurveyPayload, SurveyQuestion, SurveyStep } from '@/lib/survey/load';
import { LangContext, type Lang } from './lang';
import Question, { IdentityField, type ValueUpdate } from './questions';

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
 * One slide.
 *
 * The identity block is the one slide holding two fields — name and email are a
 * single thought and neither is numbered.
 */
type Slice = { from: number; to: number; part: number; parts: number };

type Card =
  | { kind: 'fields'; questions: SurveyQuestion[] }
  | { kind: 'question'; question: SurveyQuestion; slice?: Slice };

/**
 * How many scale pairs share a screen.
 *
 * It was four, measured against a 390x844 browser window. A real iPhone is not
 * that: Safari's address bar takes roughly a hundred points off the bottom, and
 * with the Thai reveal open — which is the state a Thai reader is in for the
 * whole survey — the fourth pair sat behind the Continue button and could not
 * be reached — the deck snapped, so a screen taller than the viewport could not
 * be rested inside. The deck is gone and a long question now simply scrolls,
 * but three still reads better than four: a battery you can take in at a glance
 * is answered more honestly than one you have to scroll through.
 *
 * Three makes the ten pairs 3 · 3 · 2 · 2 rather than 4 · 3 · 3.
 */
const PAIRS_PER_SLIDE = 3;

/**
 * How many pairs each part holds, balanced rather than greedy.
 *
 * Ten pairs at four a slide is three parts. Filling them greedily gives 4-4-2,
 * and a final slide holding two rows under a pinned question looks like
 * something went wrong. Spreading the remainder gives 4-3-3.
 */
function sliceSizes(count: number, max: number) {
  const parts = Math.ceil(count / max);
  const base = Math.floor(count / parts);
  const extra = count % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

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

  const draftKey = useRef<string>('');
  const storageKey = draftStorageKey(survey.token);

  const steps = useMemo(
    () => survey.steps.filter((s) => stepIsVisible(s, values, survey.steps)),
    [survey.steps, values],
  );

  const cards = useMemo(() => {
    const out: Card[] = [];
    for (const s of steps) {
      let pending: SurveyQuestion[] = [];
      const flush = () => {
        if (!pending.length) return;
        out.push({ kind: 'fields', questions: pending });
        pending = [];
      };
      for (const q of s.questions) {
        if (q.type === 'short_text' && q.number === null) {
          pending.push(q);
          continue;
        }
        flush();

        const pairs = q.config.pairs?.length ?? 0;
        if (q.type === 'linear_scale' && pairs > PAIRS_PER_SLIDE) {
          const sizes = sliceSizes(pairs, PAIRS_PER_SLIDE);
          let from = 0;
          sizes.forEach((size, i) => {
            out.push({
              kind: 'question',
              question: q,
              slice: { from, to: from + size, part: i + 1, parts: sizes.length },
            });
            from += size;
          });
          continue;
        }

        out.push({ kind: 'question', question: q });
      }
      flush();
    }
    return out;
  }, [steps]);

  /* the last question; past it is the send screen */
  const LAST = cards.length;
  /* the send screen is still a position for the progress bar to count towards */
  const STOPS = LAST + 1;

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
   * How much of the screen the phone keyboard is covering, as a CSS variable.
   *
   * The visual viewport shrinks when the keyboard opens; the layout viewport
   * does not. Measuring the difference is the only way to keep the OK button
   * sitting on top of the keyboard rather than underneath it — and Continue is
   * the one control here, so losing it mid-answer strands the respondent.
   */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${Math.round(covered)}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--kb');
    };
  }, []);

  /* the questions end at the last card; past it is the send screen */
  const advance = (n: number) => (n >= cards.length ? openSend() : setStep(n + 1));

  const goTo = useCallback((index: number) => {
    setStep(index);
  }, []);

  const leaveSend = useCallback((index: number) => {
    setFromSend(true);
    setSending(false);
    setStep(index);
  }, []);

  const openSend = useCallback(() => {
    setFromSend(false);
    setSending(true);
  }, []);

  /* Every view starts at its own top. Nothing here restores a scroll position:
     a question is a page now, and a new page begins at the beginning. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, sending, submitted]);

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

  const blanks = useMemo(() => {
    /* A split battery occupies several cards but is still one question — it is
       listed once, pointing at the slide it starts on. */
    const seen = new Set<string>();
    return cards
      .map((c, i) => ({ card: c, index: i + 1 }))
      .flatMap(({ card, index }) =>
        (card.kind === 'question' ? [card.question] : card.questions)
          .filter((q) => q.required && !isAnswered(q.type, values[q.ref]))
          .filter((q) => !seen.has(q.ref) && seen.add(q.ref))
          .map((q) => ({ question: q, index })),
      );
  }, [cards, values]);

  /* numbered questions only — name and email are not numbered anywhere else */
  const answered =
    survey.questionCount - blanks.filter(({ question }) => question.number !== null).length;

  async function submit() {
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

  /* Terminal, so it is tested before every other screen. It was tested after
     `sending`, which is still true when the send succeeds — the answers reached
     the server, the response row was written, and the respondent was left
     looking at the same Ready to send screen with a live button. The obvious
     thing to do next is press it again. */
  if (submitted) {
    return (
      <LangContext.Provider value={LEAD}>
        <div className="survey-shell client-surface">
          {/* the floor controls are revealed by data-active, and there is only
              ever one screen — without it the only action here was invisible */}
          <div className="slide" data-active="">
            <div className="slidebody">
              <div className="slidemain">
                <div className="done-mark" aria-hidden="true">
                  ✓
                </div>
              <h1>
                Thank you, <em>{submitted}</em>.
              </h1>
              <p className="intro">
                Your answers are with the Designally team. We&apos;ll bring every perspective
                together and see you at the kick-off meeting.
              </p>
                <p className="introth th">
                  คำตอบของคุณถูกส่งถึงทีมแล้ว แล้วพบกันในการประชุมเริ่มโปรเจกต์
                </p>
              </div>
              <button className="btn btn-quiet start" onClick={answerAsSomeoneElse}>
                Answer as another stakeholder
              </button>
              <p className="takes">Know someone else who should answer? Forward the same link.</p>
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
          <div className="bar" aria-hidden="true">
            <i style={{ transform: 'scaleX(1)' }} />
          </div>
          <div className="slide sendslide" data-active="">
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

                {blanks.length > 0 && (
                  <>
                    <p className="blankcount">
                      {blanks.length} still blank · ยังไม่ได้ตอบ {blanks.length} ข้อ
                    </p>
                    <ul className="blanklist">
                      {blanks.map(({ question, index }) => (
                        <li key={question.ref}>
                          <button type="button" onClick={() => leaveSend(index)}>
                            <b>{question.number ?? '·'}</b>
                            <span>{question.textEn}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
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
                <button className="btn btn-primary ok" onClick={submit} disabled={submitting}>
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
      <div className={`survey-shell client-surface${step === WELCOME ? ' at-welcome' : ''}`}>
        <div className="bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.min(step / STOPS, 1)})` }} />
        </div>

        {fromSend && (
          <button className="toreview" type="button" onClick={openSend}>
            Back to send
          </button>
        )}

        {card ? (
          <section className="slide" data-active="" key={step}>
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
                  <Question
                    question={card.question}
                    value={values[card.question.ref]}
                    onChange={(v) => setValue(card.question.ref, v)}
                    onEnter={() => advance(step)}
                    total={survey.questionCount}
                    slice={card.slice}
                  />
                )}
              </div>
              <Ok
                onClick={() => advance(step)}
                onBack={() => goTo(step - 1)}
                hint={card.kind === 'question' && card.question.type === 'paragraph'}
              />
            </div>
          </section>
        ) : (
          <section className="slide" data-active="">
            <div className="slidebody">
              <div className="slidemain">
                <h1>Let&apos;s shape your brand, together.</h1>
                <p className="intro">
                  This questionnaire helps our team understand your brand before we begin
                  designing. There are no wrong answers.
                </p>
                {/* The two screens with no per-question reveal keep their Thai
                    line, so a Thai-only reader is never stranded at the moment
                    they decide to start or to send. */}
                <p className="introth th">
                  แบบสอบถามนี้ช่วยให้ทีมเข้าใจแบรนด์ของคุณก่อนเริ่มออกแบบ ไม่มีคำตอบที่ผิด
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
              <p className="takes">
                {started
                  ? 'Your answers were saved on this device. · คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้'
                  : `About 20 minutes · ${survey.questionCount} questions · ประมาณ 20 นาที`}
              </p>
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
  hint,
}: {
  onClick: () => void;
  onBack: () => void;
  hint?: boolean;
}) {
  return (
    <div className="okrow">
      <button className="okback" onClick={onBack} type="button" aria-label="Previous question">
        <Chevron back />
      </button>
      <button className="btn btn-primary ok" onClick={onClick}>
        Continue
      </button>
      <span className="okhint">{hint ? 'Shift + Enter for a line break' : 'or press Enter'}</span>
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
function Chevron({ up, back }: { up?: boolean; back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d={
          back
            ? 'M16.5 3 L7.5 12 L16.5 21'
            : up
              ? 'M3 16.5 L12 7.5 L21 16.5'
              : 'M3 7.5 L12 16.5 L21 7.5'
        }
        /* Centred by eye, not by box, and the eye wants it moved *toward* the
           point.
           A chevron's open end spreads two strokes apart and covers area; its
           apex is a single node covering almost none. The perceived weight is
           therefore at the open end, so a box-centred chevron reads as pushed
           that way — and with the apex landing near the middle of a disc it
           stops being an arrow and becomes a clock hand.
           1.5px toward the point, judged against a centre line at 1, 0, -1,
           -1.5, -2 and -2.5: at 0 the apex sits on the line, and by -2 the mark
           has visibly overshot. */
        transform={back ? 'translate(-1.5 0)' : up ? 'translate(0 -1.5)' : 'translate(0 1.5)'}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
