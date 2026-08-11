'use client';

import Image from 'next/image';
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
  /* An email field typed on a phone deserves the @ keyboard and no
     autocapitalise — the first character is otherwise a capital every time. */
  const email = question.config.maps_to === 'email';
  return (
    <div>
      <label className="f" htmlFor={id}>
        {question.textEn} <span>· {question.textTh}</span>
      </label>
      <input
        id={id}
        type={email ? 'email' : 'text'}
        inputMode={email ? 'email' : undefined}
        autoComplete={email ? 'email' : 'name'}
        autoCapitalize={email ? 'none' : undefined}
        spellCheck={email ? false : undefined}
        className="input"
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
      {email && (question.helpEn || question.helpTh) && (
        <span className="fhelp">
          {[question.helpEn, question.helpTh].filter(Boolean).join(' · ')}
        </span>
      )}
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

/**
 * A choice carrying an image is answered by looking, not by reading.
 *
 * "Bold" and "โดดเด่น" mean whatever the person reading them already thinks
 * they mean, and that is the one question in the survey where the client and
 * the designer must be picturing the same thing. The mood board is the answer;
 * the word is its handle.
 */
function asBoards(config: QuestionConfig) {
  return (config.choices ?? []).some((c) => Boolean(c.image));
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
      image: c.image,
    })),
    ...(config.other
      ? [{ key: OTHER, en: 'Other', th: 'อื่น ๆ', label: 'Other อื่น ๆ', image: undefined }]
      : []),
  ];

  const chips = asChips(config);
  const boards = !chips && asBoards(config);

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
      ) : boards ? (
        <div className="boards">
          {options.map((o) => {
            const on = chosen.has(o.key);
            /* "Friendly — warm, approachable, human" → the half after the dash */
            const gloss = o.label.includes('—') ? o.label.split('—')[1].trim() : null;
            return (
              <label key={o.key} className={`board${on ? ' sel' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && atMax}
                  onChange={() => toggle(o.key)}
                />
                {o.image && (
                  <Image
                    src={o.image}
                    alt={`Reference images for ${o.en}`}
                    width={578}
                    height={403}
                    sizes="(max-width: 600px) 92vw, 300px"
                  />
                )}
                <span className="boardname">
                  <b>{o.en}</b>
                  <span className="pth th">{o.th}</span>
                  {gloss && <small>{gloss}</small>}
                </span>
              </label>
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
  /* Version 1 scales run 1..points; the version-2 personality scales run 0..10,
     where 0 is a position and not an absence of one. */
  const start = question.config.start ?? 1;
  const pairs = question.config.pairs ?? [];
  /* more points than fit one row of 44px targets on a 390px screen */
  const wide = points > 7;

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
          {/**
            * Up to seven points keep the prototype's graded dots, which fit one
            * row at 390px with 44px targets — which is every scale in versions 1
            * and 3. Version 2 ran eleven, and eleven 44px targets need 484px
            * where a phone offers 350; those are numbered and allowed to wrap
            * instead. A dot that wraps loses its meaning, because position is
            * all it has, but a number keeps it. Kept for the surveys sent then.
            */}
          <div
            className={`pts${wide ? ' pts-wide' : ''}`}
            role="group"
            aria-labelledby={`pole-${question.ref}-${i}`}
          >
            {Array.from({ length: points }, (_, n) => n + start).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={v.scale[String(i)] === n}
                aria-label={`${p.left_en} to ${p.right_en}, ${n} of ${start + points - 1}`}
                onClick={() => set(i, n)}
              >
                {wide ? <span>{n}</span> : <i />}
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
