'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isAnswered, type DraftValues } from '@/lib/survey/answers';
import type { SurveyPayload, SurveyStep } from '@/lib/survey/load';
import Question, { IdentityField, type ValueUpdate } from './questions';

const WELCOME = 0;

function draftStorageKey(token: string) {
  return `designally.draft.${token}`;
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

export default function SurveyForm({ survey }: { survey: SurveyPayload }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(WELCOME);
  const [values, setValues] = useState<DraftValues>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameMissing, setNameMissing] = useState(false);

  const draftKey = useRef<string>('');
  const storageKey = draftStorageKey(survey.token);

  const steps = useMemo(
    () => survey.steps.filter((s) => stepIsVisible(s, values, survey.steps)),
    [survey.steps, values],
  );
  const total = steps.length;
  const DONE = total + 1;

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
        setStep(winner.step ?? WELCOME);
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

  const blankRequired = useMemo(
    () =>
      steps
        .flatMap((s) => s.questions)
        .filter((q) => q.required && !isAnswered(q.type, values[q.ref])).length,
    [steps, values],
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
        'Your answers could not be sent. They are saved on this device — please try again. · ส่งคำตอบไม่สำเร็จ คำตอบยังถูกบันทึกไว้ กรุณาลองอีกครั้ง',
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

  const progress = Math.min(step / (total + 1), 1) * 100;

  return (
    <div className="survey-shell client-surface">
      <div className="bar">
        <i style={{ width: `${progress}%` }} />
      </div>

      <div className="sform">
        <div className="head">
          <span className="wordmark">
            Design<em>ally</em>
          </span>
          <span className="proj">
            {survey.clientName} · {survey.package === 'branding' ? 'Branding' : survey.package === 'website' ? 'Website' : 'Branding + Website'}
          </span>
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
              {started ? 'Continue · ทำต่อ' : 'Start · เริ่มทำแบบสอบถาม'}
            </button>
            {started && (
              <p className="saved">
                Your answers on this device were saved. · คำตอบของคุณถูกบันทึกไว้ในเครื่องนี้แล้ว
              </p>
            )}
          </section>
        )}

        {steps.map((s, i) => {
          const n = i + 1;
          if (step !== n) return null;
          const last = n === total;

          return (
            <section className="step" key={s.eyebrowEn}>
              <header className="stephead">
                <p className="stepno">
                  Step {n} of {total} — {s.eyebrowEn}
                </p>
                <h2>{s.headingEn}</h2>
                {(s.descEn || s.descTh) && (
                  <p className="desc">{[s.descEn, s.descTh].filter(Boolean).join(' · ')}</p>
                )}
              </header>

              <StepQuestions
                step={s}
                values={values}
                setValue={setValue}
                nameMissing={nameMissing}
                nameRef={nameQuestion?.ref}
              />

              {last && blankRequired > 0 && (
                <p className="saved">
                  {blankRequired} {blankRequired === 1 ? 'question is' : 'questions are'} still
                  blank · ยังไม่ได้ตอบ {blankRequired} ข้อ — you can send anyway, or go back and add
                  them.
                </p>
              )}
              {last && error && (
                <p className="sq" style={{ color: 'var(--caution)', marginTop: 18 }}>
                  {error}
                </p>
              )}

              <div className="nav">
                <button className="btn btn-quiet" onClick={() => go(n - 1)}>
                  Back · ย้อนกลับ
                </button>
                <span className="of">
                  {n} / {total}
                </span>
                {last ? (
                  <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                    {submitting ? 'Sending · กำลังส่ง' : 'Send answers · ส่งคำตอบ'}
                  </button>
                ) : (
                  <button className="btn btn-ink" onClick={() => go(n + 1)}>
                    Continue · ถัดไป
                  </button>
                )}
              </div>

              {started && savedAt && (
                <p className="saved" aria-live="polite">
                  Saved — you can close this and come back. · บันทึกแล้ว ปิดหน้านี้แล้วกลับมาทำต่อได้
                </p>
              )}
            </section>
          );
        })}

        {step === DONE && (
          <section className="step">
            <div className="done-mark" aria-hidden="true">
              ✓
            </div>
            <h1>
              Thank you, <em>{submitted || 'friend'}</em>.
            </h1>
            <p className="intro">
              Your answers are with the Designally team. We&apos;ll bring every perspective together
              and see you at the kick-off meeting.
            </p>
            <p className="th" style={{ maxWidth: '58ch', marginTop: 8 }}>
              คำตอบของคุณถูกส่งถึงทีมแล้ว แล้วพบกันในการประชุมเริ่มโปรเจกต์
            </p>
            <div className="facts">
              <div>
                <b>Know someone else who should answer?</b> Just forward the same link — we&apos;ll
                include their voice too. · ส่งลิงก์เดิมต่อให้เพื่อนร่วมงานได้เลย
              </div>
            </div>
            <button className="btn btn-quiet" onClick={answerAsSomeoneElse}>
              Answer as another stakeholder · ตอบในฐานะผู้อื่น
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * Consecutive unnumbered short answers — the identity block's name and role —
 * sit side by side, as in the prototype. Everything else runs full width.
 */
function StepQuestions({
  step,
  values,
  setValue,
  nameMissing,
  nameRef,
}: {
  step: SurveyStep;
  values: DraftValues;
  setValue: (ref: string, value: ValueUpdate) => void;
  nameMissing: boolean;
  nameRef?: string;
}) {
  const groups: (SurveyStep['questions'] | SurveyStep['questions'][number])[] = [];

  for (const q of step.questions) {
    const compact = q.type === 'short_text' && q.number === null;
    const last = groups[groups.length - 1];
    if (compact && Array.isArray(last)) last.push(q);
    else if (compact) groups.push([q]);
    else groups.push(q);
  }

  return (
    <>
      {groups.map((group, i) =>
        Array.isArray(group) ? (
          <div
            key={`grid-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
              marginBottom: 26,
            }}
          >
            {group.map((q) => (
              <div key={q.ref}>
                <IdentityField
                  question={q}
                  value={values[q.ref]}
                  onChange={(v) => setValue(q.ref, v)}
                />
                {nameMissing && q.ref === nameRef && (
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
            key={group.ref}
            question={group}
            value={values[group.ref]}
            onChange={(v) => setValue(group.ref, v)}
          />
        ),
      )}
    </>
  );
}
