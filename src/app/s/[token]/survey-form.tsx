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
 * A rating battery longer than this is dealt out over several slides.
 *
 * Ten bipolar scales on one slide ran 1.45 screens even after the rows were
 * compressed. Splitting keeps enough of the battery on screen to calibrate
 * against — you can see the ones you just rated — which is the whole reason
 * these stay together rather than becoming ten separate questions.
 *
 * Four, not five: with the Thai pole label set under the English rather than
 * beside it, a row is 113px, and five rows plus the pinned question overran the
 * screen by 63px — enough that the button bar started covering the last row.
 *
 * It remains one question: one row in the seed, one number on the badge, one
 * answer in the database. Only the presentation is split.
 */
const PAIRS_PER_SLIDE = 4;

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
  /**
   * The send screen is a page, not a slide.
   *
   * It was the last card in the deck, which made it something a person could
   * scroll onto by accident and, worse, put the review of every answer inside
   * a mandatory scroll-snap container that could not reach its own bottom.
   * Leaving the deck is a decision, so it is a state change, not a scroll
   * position.
   */
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

  const draftKey = useRef<string>('');
  const deck = useRef<HTMLDivElement | null>(null);
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

  /* the last slide in the deck — the send screen is no longer one of them */
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

  /* ── the deck ───────────────────────────────────────────────────── */

  /**
   * Scrolling is the navigation.
   *
   * Every slide is one viewport tall and snaps, so a wheel, a swipe, Page
   * Up/Down and the chevrons are all the same gesture — and any question stays
   * reachable by scrolling back to it instead of stepping through the ones in
   * between.
   *
   * The active slide is read from the scroll position rather than held in state
   * and pushed at it. A person can scroll anywhere at any moment, so the
   * position is theirs to set and ours to follow; a `step` that tried to drive
   * the scroller would fight every swipe.
   */
  /**
   * How much of the screen the phone keyboard is covering, as a CSS variable.
   *
   * The visual viewport shrinks when the keyboard opens; the layout viewport
   * does not. Measuring the difference is the only way to keep the OK button
   * sitting on top of the keyboard rather than underneath it — and OK is the
   * one control on the slide, so losing it mid-answer strands the respondent.
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

  /* the deck ends at the last question; past it is the send screen */
  const advance = (n: number) => (n >= cards.length ? openSend() : goTo(n + 1));

  const goTo = useCallback((index: number) => {
    const el = deck.current?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /**
   * Back out of the send screen and land on a question.
   *
   * The deck is unmounted while the send screen is up, so the scroll cannot be
   * set until React has put it back. The target is parked here and an effect
   * places it on the render that follows — without smoothing, because this is a
   * page changing rather than a scroll being made.
   */
  const pendingSlide = useRef<number | null>(null);
  const leaveSend = useCallback((index: number) => {
    pendingSlide.current = index;
    setFromSend(true);
    setSending(false);
  }, []);

  const openSend = useCallback(() => {
    setFromSend(false);
    setSending(true);
  }, []);

  useEffect(() => {
    if (sending || pendingSlide.current === null) return;
    const index = pendingSlide.current;
    pendingSlide.current = null;
    const root = deck.current;
    const el = root?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    if (!root || !el) return;

    /* The deck sets `scroll-behavior: smooth`, which applies to scrollTop and
       scrollIntoView alike — so leaving the send screen animated a scroll
       through every slide between, and Chrome's duration grows with distance:
       from the top of a 24-slide deck it was still travelling seconds later and
       came to rest wherever it had got to. This is a page arriving, not a
       scroll being made, so the behaviour is suspended for the one assignment
       and handed straight back. */
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    root.scrollTop = el.offsetTop;
    root.style.scrollBehavior = previous;
    setStep(index);
  }, [sending]);

  useEffect(() => {
    const root = deck.current;
    if (!root || submitted || sending) return;

    /**
     * The active slide is the one covering the middle of the screen.
     *
     * This was an IntersectionObserver firing above a fixed ratio, which cannot
     * describe a slide taller than the viewport: the send screen listing every
     * blank question runs 2,466px, so at most 34% of it is ever visible, it
     * never crossed the threshold, and it never became active — which meant its
     * Send answers button never appeared and the survey could not be submitted
     * by anyone who had left a question blank.
     *
     * A midpoint works at any height and has no threshold to tune.
     */
    const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
    let frame = 0;

    const measure = () => {
      frame = 0;
      const middle = root.clientHeight / 2;
      const rootTop = root.getBoundingClientRect().top;
      const found = slides.find((s) => {
        const r = s.getBoundingClientRect();
        return r.top - rootTop <= middle && r.bottom - rootTop > middle;
      });
      if (found) setStep(Number(found.dataset.slide));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    root.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [cards.length, submitted, sending]);

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
    setStep(WELCOME);
    requestAnimationFrame(() => goTo(WELCOME));
  }

  /* ── render ─────────────────────────────────────────────────────── */

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
              {/* Back is the same round arrow as every other back on this
                  survey. Off the deck the stepper does not exist, so here it
                  shows at every width rather than on a phone only. */}
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

          {/* the same ramp the deck's controls sit on — the list runs under it */}
          <div className="floorblur" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </LangContext.Provider>
    );
  }

  if (submitted) {
    return (
      <LangContext.Provider value={LEAD}>
        <div className="survey-shell client-surface">
          <div className="slide">
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

        <div className="deck" ref={deck}>
          <section
            className="slide"
            data-slide={WELCOME}
            data-active={step === WELCOME ? '' : undefined}
          >
            <div className="slidebody">
              <div className="slidemain">
                <h1>Let&apos;s shape your brand, together.</h1>
              <p className="intro">
                This questionnaire helps our team understand your brand before we begin designing.
                There are no wrong answers.
              </p>
              {/* The two screens with no per-question reveal keep their Thai
                  line, so a Thai-only reader is never stranded at the moment
                  they decide to start or to send. */}
                <p className="introth th">
                  แบบสอบถามนี้ช่วยให้ทีมเข้าใจแบรนด์ของคุณก่อนเริ่มออกแบบ ไม่มีคำตอบที่ผิด
                </p>
              </div>

              <button className="btn btn-primary start" onClick={() => goTo(1)} disabled={!ready}>
                {started ? 'Continue' : 'Start'}
              </button>
              <p className="takes">
                {started
                  ? 'Your answers were saved on this device. · คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้'
                  : `About 20 minutes · ${survey.questionCount} questions · ประมาณ 20 นาที`}
              </p>
            </div>
          </section>

          {cards.map((card, i) => {
            const n = i + 1;
            return (
              <section
                className="slide"
                data-slide={n}
                data-active={step === n ? '' : undefined}
                key={n}
              >
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
                            onEnter={() => advance(n)}
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
                        onEnter={() => advance(n)}
                        total={survey.questionCount}
                        slice={card.slice}
                      />
                    )}
                  </div>
                  <Ok
                    onClick={() => advance(n)}
                    onBack={() => goTo(n - 1)}
                    hint={card.kind === 'question' && card.question.type === 'paragraph'}
                  />
                </div>
              </section>
            );
          })}

        </div>

        {/* The ramp the controls sit on. Four stacked layers, blur doubling
            downward, each masked to a lower band — a single blurred pane would
            put a hard horizontal seam across the slide. Purely presentational
            and never in the way of a tap. */}
        <div className="floorblur" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>


        <nav className="deck-nav" aria-label="Move between questions">
          <button
            type="button"
            onClick={() => goTo(Math.max(step - 1, 0))}
            disabled={step === 0}
            aria-label="Previous question"
          >
            <Chevron up />
          </button>
          <button
            type="button"
            onClick={() => (step >= LAST ? openSend() : goTo(step + 1))}
            aria-label="Next question"
          >
            <Chevron />
          </button>
        </nav>

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
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
