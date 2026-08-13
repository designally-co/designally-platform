'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isAnswered, type DraftValues } from '@/lib/survey/answers';
import type { SurveyPayload, SurveyQuestion, SurveyStep } from '@/lib/survey/load';
import { packageFull } from '@/lib/team/labels';
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
 * One screen.
 *
 * Measured at 390px, the old grouped steps ran 2.1 to 5.4 phone screens each —
 * Visual direction alone was seven questions in one continuous scroll. A step
 * is now a rhythm rather than a page: each question holds the screen on its
 * own, and the step's framing sentence appears once, on its first question,
 * instead of being repeated or lost.
 *
 * The identity block is the one exception. Name and email are a single thought
 * and neither is numbered, so consecutive unnumbered short answers share a card.
 */
type Card =
  | { kind: 'fields'; questions: SurveyQuestion[]; step: SurveyStep; stepFirst: boolean }
  | { kind: 'question'; question: SurveyQuestion; step: SurveyStep; stepFirst: boolean };

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
  const storageKey = draftStorageKey(survey.token);

  const steps = useMemo(
    () => survey.steps.filter((s) => stepIsVisible(s, values, survey.steps)),
    [survey.steps, values],
  );

  const cards = useMemo(() => {
    const out: Card[] = [];
    for (const s of steps) {
      let first = true;
      let pending: SurveyQuestion[] = [];
      const flush = () => {
        if (!pending.length) return;
        out.push({ kind: 'fields', questions: pending, step: s, stepFirst: first });
        first = false;
        pending = [];
      };
      for (const q of s.questions) {
        if (q.type === 'short_text' && q.number === null) {
          pending.push(q);
          continue;
        }
        flush();
        out.push({ kind: 'question', question: q, step: s, stepFirst: first });
        first = false;
      }
      flush();
    }
    return out;
  }, [steps]);

  const REVIEW = cards.length + 1;
  const DONE = cards.length + 2;

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
        /* A draft written before the survey became one-question-per-screen holds
           a step index that no longer means anything. Anything past the end
           lands on the review screen rather than on a blank page. */
        setStep(Math.min(winner.step ?? WELCOME, REVIEW));
        setSavedAt(winner.updatedAt ?? null);
      }
      setReady(true);
    }

    void restore();
    return () => {
      cancelled = true;
    };
    // REVIEW is derived from the question list, which does not change mid-session
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** Nothing has been answered yet — don't claim a draft exists. */
  const started = Object.keys(values).length > 0;

  // Local save is immediate-ish; the server copy follows a few seconds behind.
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

  /* ── navigation ─────────────────────────────────────────────────── */

  const go = (next: number) => {
    setStep(next);
    if (Object.keys(values).length) {
      persistLocal(next, values);
      void persistServer(next, values);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── submit ─────────────────────────────────────────────────────── */

  const nameQuestion = survey.steps[0]?.questions[0];
  const respondentName =
    nameQuestion && typeof values[nameQuestion.ref] === 'string'
      ? (values[nameQuestion.ref] as string).trim()
      : '';

  /** Blank required questions, with the card each one lives on. */
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
      go(1);
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
      setStep(DONE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── render ─────────────────────────────────────────────────────── */

  const t = (en: string, th: string) => (lang === 'th' ? th : en);
  const card = step >= 1 && step <= cards.length ? cards[step - 1] : null;
  const progress = Math.min(step / (cards.length + 1), 1) * 100;
  const hero = step === WELCOME || step === DONE;
  /* question and send screens anchor their nav to the floor of the viewport */
  const carded = Boolean(card) || step === REVIEW;

  return (
    <LangContext.Provider value={lang}>
      <div className={`survey-shell client-surface${step === WELCOME ? ' at-welcome' : ''}`}>
        <div className="bar">
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>

        <div className={`sform${hero ? ' hero' : ''}${carded ? ' card' : ''}`}>
          <div className="head">
            <span className="wordmark">
              Design<em>ally</em>
            </span>
            <span className="proj">
              {survey.clientName} · {packageFull(survey.package)}
            </span>
            {step !== WELCOME && step !== DONE && (
              <div className="langswitch" role="group" aria-label="Language · ภาษา">
                {(['th', 'en'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => chooseLang(l)}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {step === WELCOME && (
            <section className="step">
              <h1>
                Let&apos;s shape your brand, <em>together</em>.
              </h1>
              <p className="th" style={{ marginBottom: 26 }}>
                มาร่วมกันสร้างตัวตนของแบรนด์คุณ — คำตอบของคุณคือรากฐานของงานออกแบบ
              </p>
              <p className="intro">
                This questionnaire helps our team understand your brand deeply before we begin
                designing. There are no wrong answers — please answer honestly, in your own words.
              </p>
              <p className="th" style={{ maxWidth: '58ch' }}>
                แบบสอบถามนี้ช่วยให้ทีมเข้าใจแบรนด์ของคุณก่อนเริ่มออกแบบ ไม่มีคำตอบที่ผิด
              </p>

              {/* The one place both languages must appear side by side: each
                  option has to be legible to the person it is for. */}
              <div className="langpick">
                <span className="langpicklabel">Answer in · ตอบเป็นภาษา</span>
                <div className="langswitch big" role="group" aria-label="Language · ภาษา">
                  {(['th', 'en'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={lang === l}
                      onClick={() => chooseLang(l)}
                    >
                      {LANG_LABEL[l]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="facts">
                <div>
                  <b>≈ 20 minutes</b> เวลาโดยประมาณ
                </div>
                <div>
                  <b>{survey.questionCount} questions</b> จำนวนคำถาม
                </div>
                <div>
                  <b>Share freely</b> ส่งต่อให้เพื่อนร่วมงานได้
                </div>
              </div>
              <button className="btn btn-ink" onClick={() => go(1)} disabled={!ready}>
                {started ? 'Continue' : 'Start'}
              </button>
              {started && (
                <p className="saved">
                  Your answers on this device were saved. · คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้แล้ว
                </p>
              )}
            </section>
          )}

          {card && (
            <section className="step" key={step}>
              {/* The step's framing sentence, once, on the question that opens
                  it — not repeated on every card and not lost. */}
              {card.stepFirst && (card.step.descEn || card.step.descTh) && (
                <p className="stepframe">{t(card.step.descEn ?? '', card.step.descTh ?? '')}</p>
              )}

              {card.kind === 'fields' ? (
                <div className="identitygrid">
                  {card.questions.map((q) => (
                    <div key={q.ref}>
                      <IdentityField
                        question={q}
                        value={values[q.ref]}
                        onChange={(v) => setValue(q.ref, v)}
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
                />
              )}

              <div className="nav">
                <button className="btn btn-quiet" onClick={() => go(step - 1)}>
                  Back
                </button>
                <span className="of">
                  {card.kind === 'question' && card.question.number
                    ? `${card.question.number} / ${survey.questionCount}`
                    : t('About you', 'เกี่ยวกับคุณ')}
                </span>
                <button className="btn btn-ink" onClick={() => go(step + 1)}>
                  Continue
                </button>
              </div>

              {started && savedAt && (
                <p className="saved" aria-live="polite">
                  {t(
                    'Saved — you can close this and come back.',
                    'บันทึกแล้ว ปิดหน้านี้แล้วกลับมาทำต่อได้',
                  )}
                </p>
              )}
            </section>
          )}

          {step === REVIEW && (
            <section className="step">
              <h2>{t('Ready to send', 'พร้อมส่งคำตอบ')}</h2>
              {blanks.length === 0 ? (
                <p className="desc">
                  {t(
                    'Every question is answered. Send it whenever you are ready.',
                    'ตอบครบทุกข้อแล้ว ส่งได้เลยเมื่อพร้อม',
                  )}
                </p>
              ) : (
                <>
                  <p className="desc">
                    {t(
                      `${blanks.length} ${blanks.length === 1 ? 'question is' : 'questions are'} still blank. You can send anyway, or go back to any of them.`,
                      `ยังไม่ได้ตอบ ${blanks.length} ข้อ ส่งเลยก็ได้ หรือกลับไปตอบก่อนก็ได้`,
                    )}
                  </p>
                  <ul className="blanklist">
                    {blanks.map(({ question, index }) => (
                      <li key={question.ref}>
                        <button type="button" onClick={() => go(index)}>
                          <b>{question.number ? `${question.number}.` : '·'}</b>
                          <span>{t(question.textEn, question.textTh)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {error && (
                <p className="sq" style={{ color: 'var(--caution)', marginTop: 18 }}>
                  {error}
                </p>
              )}

              <div className="nav">
                <button className="btn btn-quiet" onClick={() => go(step - 1)}>
                  Back
                </button>
                <span className="of">
                  {survey.questionCount - blanks.length} / {survey.questionCount}
                </span>
                <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? 'Sending' : 'Send answers'}
                </button>
              </div>
            </section>
          )}

          {step === DONE && (
            <section className="step">
              <div className="done-mark" aria-hidden="true">
                ✓
              </div>
              <h1>
                Thank you, <em>{submitted || 'friend'}</em>.
              </h1>
              <p className="intro">
                Your answers are with the Designally team. We&apos;ll bring every perspective
                together and see you at the kick-off meeting.
              </p>
              <p className="th" style={{ maxWidth: '58ch', marginTop: 8 }}>
                คำตอบของคุณถูกส่งถึงทีมแล้ว แล้วพบกันในการประชุมเริ่มโปรเจกต์
              </p>
              <div className="facts">
                <div>
                  <b>Know someone else who should answer?</b> Just forward the same link —
                  we&apos;ll include their voice too. · ส่งลิงก์เดิมต่อให้เพื่อนร่วมงานได้เลย
                </div>
              </div>
              <button className="btn btn-quiet" onClick={answerAsSomeoneElse}>
                Answer as another stakeholder
              </button>
            </section>
          )}
        </div>
      </div>
    </LangContext.Provider>
  );
}
