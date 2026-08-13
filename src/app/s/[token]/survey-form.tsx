'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isAnswered, type DraftValues } from '@/lib/survey/answers';
import type { SurveyPayload, SurveyQuestion, SurveyStep } from '@/lib/survey/load';
import { LangContext, LANG_LABEL, type Lang } from './lang';
import Question, { IdentityField, type ValueUpdate } from './questions';

const WELCOME = 0;

function draftStorageKey(token: string) {
  return `designally.draft.${token}`;
}

function langStorageKey(token: string) {
  return `designally.lang.${token}`;
}

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
type Card =
  | { kind: 'fields'; questions: SurveyQuestion[] }
  | { kind: 'question'; question: SurveyQuestion };

export default function SurveyForm({ survey }: { survey: SurveyPayload }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(WELCOME);
  const [values, setValues] = useState<DraftValues>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameMissing, setNameMissing] = useState(false);
  const [lang, setLang] = useState<Lang>('th');

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
        out.push({ kind: 'question', question: q });
      }
      flush();
    }
    return out;
  }, [steps]);

  const LAST = cards.length + 1;

  /* ── restore ────────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      let local: StoredDraft | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) local = JSON.parse(raw) as StoredDraft;
        const savedLang = window.localStorage.getItem(langStorageKey(survey.token));
        if (savedLang === 'th' || savedLang === 'en') setLang(savedLang);
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

  const chooseLang = (next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem(langStorageKey(survey.token), next);
    } catch {
      // a blocked storage only costs the preference, not the answers
    }
  };

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
  const goTo = useCallback((index: number) => {
    const el = deck.current?.querySelector<HTMLElement>(`[data-slide="${index}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const root = deck.current;
    if (!root || submitted) return;

    const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-slide]'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.55) {
            setStep(Number((e.target as HTMLElement).dataset.slide));
          }
        }
      },
      { root, threshold: [0.56] },
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [cards.length, submitted]);

  /* ── submit ─────────────────────────────────────────────────────── */

  const nameQuestion = survey.steps[0]?.questions[0];
  const respondentName =
    nameQuestion && typeof values[nameQuestion.ref] === 'string'
      ? (values[nameQuestion.ref] as string).trim()
      : '';

  const blanks = useMemo(
    () =>
      cards
        .map((c, i) => ({ card: c, index: i + 1 }))
        .flatMap(({ card, index }) =>
          (card.kind === 'question' ? [card.question] : card.questions)
            .filter((q) => q.required && !isAnswered(q.type, values[q.ref]))
            .map((q) => ({ question: q, index })),
        ),
    [cards, values],
  );

  async function submit() {
    if (!respondentName) {
      setNameMissing(true);
      goTo(1);
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
        lang === 'th'
          ? 'ส่งคำตอบไม่สำเร็จ คำตอบยังถูกบันทึกไว้ในเครื่องนี้ กรุณาลองอีกครั้ง'
          : 'Your answers could not be sent. They are saved on this device — please try again.',
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
    setStep(WELCOME);
    requestAnimationFrame(() => goTo(WELCOME));
  }

  /* ── render ─────────────────────────────────────────────────────── */

  const t = (en: string, th: string) => (lang === 'th' ? th : en);

  if (submitted) {
    return (
      <LangContext.Provider value={lang}>
        <div className="survey-shell client-surface">
          <div className="slide">
            <div className="slidebody">
              <div className="done-mark" aria-hidden="true">
                ✓
              </div>
              <h1>
                Thank you, <em>{submitted}</em>.
              </h1>
              <p className="intro">
                {t(
                  "Your answers are with the Designally team. We'll bring every perspective together and see you at the kick-off meeting.",
                  'คำตอบของคุณถูกส่งถึงทีมแล้ว เราจะรวบรวมทุกมุมมองเข้าด้วยกัน แล้วพบกันในการประชุมเริ่มโปรเจกต์',
                )}
              </p>
              <button className="btn btn-quiet start" onClick={answerAsSomeoneElse}>
                Answer as another stakeholder
              </button>
              <p className="takes">
                {t(
                  'Know someone else who should answer? Forward the same link.',
                  'มีคนอื่นที่ควรตอบด้วยไหม ส่งลิงก์เดิมต่อได้เลย',
                )}
              </p>
            </div>
          </div>
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={lang}>
      <div className="survey-shell client-surface">
        <div className="bar" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.min(step / LAST, 1)})` }} />
        </div>

        <div className="deck" ref={deck}>
          <section className="slide" data-slide={WELCOME}>
            <div className="slidebody">
              <h1>Let&apos;s shape your brand, together.</h1>
              <p className="intro">
                {t(
                  'This questionnaire helps our team understand your brand before we begin designing. There are no wrong answers.',
                  'แบบสอบถามนี้ช่วยให้ทีมเข้าใจแบรนด์ของคุณก่อนเริ่มออกแบบ ไม่มีคำตอบที่ผิด',
                )}
              </p>

              <div className="langswitch big" role="group" aria-label="Language · ภาษา">
                {(['th', 'en'] as Lang[]).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => chooseLang(l)}>
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>

              <button className="btn btn-ink start" onClick={() => goTo(1)} disabled={!ready}>
                {started ? 'Continue' : 'Start'}
              </button>
              <p className="takes">
                {started
                  ? t('Your answers were saved on this device.', 'คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้')
                  : t(
                      `About 20 minutes · ${survey.questionCount} questions`,
                      `ประมาณ 20 นาที · ${survey.questionCount} คำถาม`,
                    )}
              </p>
            </div>
          </section>

          {cards.map((card, i) => {
            const n = i + 1;
            return (
              <section className="slide" data-slide={n} key={n}>
                <div className="slidebody">
                  {card.kind === 'fields' ? (
                    <div className="identitygrid">
                      {card.questions.map((q) => (
                        <div key={q.ref}>
                          <IdentityField
                            question={q}
                            value={values[q.ref]}
                            onChange={(v) => setValue(q.ref, v)}
                            onEnter={() => goTo(n + 1)}
                          />
                          {nameMissing && q.ref === nameQuestion?.ref && (
                            <span className="qwarn">
                              {t(
                                'Please tell us your name so we know whose perspective this is.',
                                'กรุณากรอกชื่อของคุณ เพื่อให้เรารู้ว่านี่คือมุมมองของใคร',
                              )}
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
                      onEnter={() => goTo(n + 1)}
                    />
                  )}
                  <Ok
                    onClick={() => goTo(n + 1)}
                    onBack={() => goTo(n - 1)}
                    hint={card.kind === 'question' && card.question.type === 'paragraph'}
                  />
                </div>
              </section>
            );
          })}

          <section className="slide" data-slide={LAST}>
            <div className="slidebody">
              <h2>{t('Ready to send', 'พร้อมส่งคำตอบ')}</h2>
              {blanks.length === 0 ? (
                <p className="intro">{t('Every question is answered.', 'ตอบครบทุกข้อแล้ว')}</p>
              ) : (
                <>
                  <p className="intro">
                    {t(
                      `${blanks.length} ${blanks.length === 1 ? 'question is' : 'questions are'} still blank.`,
                      `ยังไม่ได้ตอบ ${blanks.length} ข้อ`,
                    )}
                  </p>
                  <ul className="blanklist">
                    {blanks.map(({ question, index }) => (
                      <li key={question.ref}>
                        <button type="button" onClick={() => goTo(index)}>
                          <b>{question.number ?? '·'}</b>
                          <span>{t(question.textEn, question.textTh)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {error && <p className="qwarn">{error}</p>}
              <button className="btn btn-primary start" onClick={submit} disabled={submitting}>
                {submitting ? 'Sending' : 'Send answers'}
              </button>
            </div>
          </section>
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
            onClick={() => goTo(Math.min(step + 1, LAST))}
            disabled={step === LAST}
            aria-label="Next question"
          >
            <Chevron />
          </button>
        </nav>

        {savedAt && step > 0 && (
          <p className="savednote" aria-live="polite">
            {t('Saved', 'บันทึกแล้ว')}
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
      <button className="btn btn-ink ok" onClick={onClick}>
        OK
      </button>
      <span className="okhint">{hint ? 'Shift + Enter for a line break' : 'or press Enter'}</span>
    </div>
  );
}

function Chevron({ up, back }: { up?: boolean; back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      <path
        d={back ? 'M14 6l-6 6 6 6' : up ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
