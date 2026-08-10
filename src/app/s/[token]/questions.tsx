'use client';

import { useId } from 'react';

import type { QuestionConfig } from '@/lib/db/schema';
import type { RawValue } from '@/lib/survey/answers';
import type { SurveyQuestion } from '@/lib/survey/load';

const OTHER = '__other__';

/**
 * `onChange` takes an updater as well as a value. Two taps landing in the same
 * React batch — easy on a phone with a chip grid — would otherwise both read
 * the same rendered value and the first would be lost.
 */
export type ValueUpdate = RawValue | ((prev: RawValue | undefined) => RawValue);

type Props = {
  question: SurveyQuestion;
  value: RawValue | undefined;
  onChange: (value: ValueUpdate) => void;
};

/* ── the question heading, always bilingual ───────────────────────── */

function Heading({ question }: { question: SurveyQuestion }) {
  return (
    <>
      <span className="qq">
        {question.number !== null && <span className="qn">{question.number}.</span>}
        {question.textEn}
      </span>
      <span className="qth">{question.textTh}</span>
      {(question.helpEn || question.helpTh) && (
        <span className="qhelp">
          {[question.helpEn, question.helpTh].filter(Boolean).join(' · ')}
        </span>
      )}
    </>
  );
}

/* ── paragraph and short_text ─────────────────────────────────────── */

function TextAnswer({ question, value, onChange }: Props) {
  const text = typeof value === 'string' ? value : '';
  const long = question.type === 'paragraph';
  const id = useId();

  return (
    <div className="sq">
      <label htmlFor={id}>
        <Heading question={question} />
      </label>
      {long ? (
        <textarea
          id={id}
          className="textarea"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer · คำตอบของคุณ"
        />
      ) : (
        <input
          id={id}
          type="text"
          className="input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer · คำตอบของคุณ"
        />
      )}
    </div>
  );
}

/**
 * The identity block's name and role. Unnumbered, compact, side by side — the
 * layout in reference/designally-app.html step 1.
 */
export function IdentityField({ question, value, onChange }: Props) {
  const text = typeof value === 'string' ? value : '';
  const id = useId();
  return (
    <div>
      <label className="f" htmlFor={id}>
        {question.textEn} <span>· {question.textTh}</span>
      </label>
      <input
        id={id}
        type="text"
        className="input"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ── multiple_choice ──────────────────────────────────────────────── */

function ChoiceAnswer({ question, value, onChange }: Props) {
  const v = (value ?? { choice: '' }) as { choice: string; other?: string };
  const config = question.config;
  const name = useId();

  const pick = (choice: string) =>
    onChange((prev) => {
      const current = (prev ?? { choice: '' }) as { choice: string; other?: string };
      return { ...current, choice };
    });

  return (
    <fieldset className="sq">
      <legend>
        <Heading question={question} />
      </legend>
      <div className="pick">
        {(config.choices ?? []).map((c) => (
          <label key={c.en} className={`pickone${v.choice === c.en ? ' sel' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={v.choice === c.en}
              onChange={() => pick(c.en)}
            />
            <span>
              <b>{c.en}</b>
              <span className="pth th">{c.th}</span>
            </span>
          </label>
        ))}

        {config.other && (
          <label className={`pickone${v.choice === OTHER ? ' sel' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={v.choice === OTHER}
              onChange={() => pick(OTHER)}
            />
            <span>
              <b>Other</b>
              <span className="pth th">อื่น ๆ</span>
            </span>
          </label>
        )}
      </div>

      {config.other && v.choice === OTHER && (
        <div className="otherwrap">
          <input
            type="text"
            className="input"
            value={v.other ?? ''}
            onChange={(e) => onChange({ ...v, other: e.target.value })}
            placeholder="Please tell us · โปรดระบุ"
            aria-label="Other, please tell us"
          />
        </div>
      )}
    </fieldset>
  );
}

/* ── checkboxes ───────────────────────────────────────────────────── */

/** Long word lists read as chips; short option lists read as rows. */
function asChips(config: QuestionConfig) {
  return (config.choices?.length ?? 0) > 12;
}

function CheckboxAnswer({ question, value, onChange }: Props) {
  const v = (value ?? { choices: [] }) as { choices: string[]; other?: string };
  const config = question.config;
  const chosen = new Set(v.choices);
  const max = config.max;
  const min = config.min;
  const atMax = typeof max === 'number' && v.choices.length >= max;

  const toggle = (key: string) =>
    onChange((prev) => {
      const current = (prev ?? { choices: [] }) as { choices: string[]; other?: string };
      const next = new Set(current.choices);
      if (next.has(key)) next.delete(key);
      // the question says "6–10 words"; honour the ceiling
      else if (typeof max !== 'number' || next.size < max) next.add(key);
      return { ...current, choices: [...next] };
    });

  const options = [
    ...(config.choices ?? []).map((c) => ({
      key: c.en,
      en: c.en,
      th: c.th,
      label: c.label ?? `${c.en} ${c.th}`,
    })),
    ...(config.other ? [{ key: OTHER, en: 'Other', th: 'อื่น ๆ', label: 'Other อื่น ๆ' }] : []),
  ];

  const chips = asChips(config);

  return (
    <fieldset className="sq">
      <legend>
        <Heading question={question} />
      </legend>

      {chips ? (
        <div className="chips">
          {options.map((o) => {
            const on = chosen.has(o.key);
            return (
              <button
                key={o.key}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => toggle(o.key)}
                disabled={!on && atMax}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="checks">
          {options.map((o) => {
            const on = chosen.has(o.key);
            return (
              <label key={o.key} className={`pickone${on ? ' sel' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && atMax}
                  onChange={() => toggle(o.key)}
                />
                <span>
                  <b>{o.en}</b>
                  <span className="pth th">{o.th}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {(typeof min === 'number' || typeof max === 'number') && (
        <p className="chipn" aria-live="polite">
          Selected <b>{v.choices.length}</b>
          {typeof max === 'number' ? ` of ${max}` : ''} · เลือกแล้ว {v.choices.length} คำ
          {typeof min === 'number' ? ` (ขั้นต่ำ ${min})` : ''}
        </p>
      )}

      {config.other && chosen.has(OTHER) && (
        <div className="otherwrap">
          <input
            type="text"
            className="input"
            value={v.other ?? ''}
            onChange={(e) => onChange({ ...v, other: e.target.value })}
            placeholder="Please tell us · โปรดระบุ"
            aria-label="Other, please tell us"
          />
        </div>
      )}
    </fieldset>
  );
}

/* ── linear_scale ─────────────────────────────────────────────────── */

function ScaleAnswer({ question, value, onChange }: Props) {
  const v = (value ?? { scale: {} }) as { scale: Record<string, number> };
  const points = question.config.points ?? 5;
  const pairs = question.config.pairs ?? [];

  // functional, so ten pairs answered in quick succession all survive
  const set = (index: number, point: number) =>
    onChange((prev) => {
      const current = (prev ?? { scale: {} }) as { scale: Record<string, number> };
      return { scale: { ...current.scale, [String(index)]: point } };
    });

  return (
    <div className="sq">
      <Heading question={question} />
      {pairs.map((p, i) => (
        <div className="scale" key={`${p.left_en}-${p.right_en}`}>
          <div className="poles" id={`pole-${question.ref}-${i}`}>
            <span>
              {p.left_en}
              <small className="th">{p.left_th}</small>
            </span>
            <span>
              {p.right_en}
              <small className="th">{p.right_th}</small>
            </span>
          </div>
          <div
            className="pts"
            role="group"
            aria-labelledby={`pole-${question.ref}-${i}`}
          >
            {Array.from({ length: points }, (_, n) => n + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={v.scale[String(i)] === n}
                aria-label={`${p.left_en} to ${p.right_en}, ${n} of ${points}`}
                onClick={() => set(i, n)}
              >
                <i />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── the switch ───────────────────────────────────────────────────── */

export default function Question(props: Props) {
  switch (props.question.type) {
    case 'paragraph':
    case 'short_text':
      return <TextAnswer {...props} />;
    case 'multiple_choice':
      return <ChoiceAnswer {...props} />;
    case 'checkboxes':
      return <CheckboxAnswer {...props} />;
    case 'linear_scale':
      return <ScaleAnswer {...props} />;
  }
}
