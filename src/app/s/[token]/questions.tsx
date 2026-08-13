'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import type { QuestionConfig } from '@/lib/db/schema';
import type { RawValue } from '@/lib/survey/answers';
import type { SurveyQuestion } from '@/lib/survey/load';
import { OTHER_LABEL, useLang, useOtherText, useText } from './lang';

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
  /** Enter moves on; Shift+Enter still makes a line break in a paragraph. */
  onEnter?: () => void;
  /** how many numbered questions there are, for the badge */
  total?: number;
  /** a rating battery dealt over several slides — which pairs this one holds */
  slice?: { from: number; to: number; part: number; parts: number };
};

/* ── the question, in the language that leads ─────────────────────── */

/**
 * The number is a badge, not a prefix.
 *
 * Set inline in the sentence it would read as part of the question; set as a
 * small block beside it, it reads as position — which is the only thing left
 * saying where in twenty-one you are, now that the slides carry no chrome.
 */
function Heading({ question, total }: { question: SurveyQuestion; total?: number }) {
  const t = useText();
  const help = t(question.helpEn, question.helpTh);

  return (
    <>
      <span className="qq">
        {question.number !== null && (
          <span className="qnum">
            {question.number}
            {total ? `/${total}` : ''}
          </span>
        )}
        {t(question.textEn, question.textTh)}
      </span>
      {help && <span className="qhelp">{help}</span>}
    </>
  );
}

/**
 * The same question in the other language, one tap away.
 *
 * Deliberately a sibling of the label rather than a child of it: a button
 * inside a `<label>` inherits the label's click target and would focus or
 * toggle the control it names every time somebody asked to read the question
 * again.
 */
function Alt({ question }: { question: SurveyQuestion }) {
  const lang = useLang();
  const other = useOtherText();
  const [shown, setShown] = useState(false);

  const text = other(question.textEn, question.textTh);
  const help = other(question.helpEn, question.helpTh);
  if (!text) return null;

  return (
    <div className="qalt">
      <button type="button" className="qlangbtn" aria-expanded={shown} onClick={() => setShown((s) => !s)}>
        {OTHER_LABEL[lang]}
      </button>
      {shown && (
        <div className="qaltbody">
          <span>{text}</span>
          {help && <small>{help}</small>}
        </div>
      )}
    </div>
  );
}

/**
 * Grow the field to fit what is in it, up to the ceiling CSS sets.
 *
 * This was `field-sizing: content`, which Chrome supports and **Safari does
 * not** — so on the iPhones most of this survey is answered on, a 552-character
 * brand story sat in a 58px box with fourteen lines hidden inside it, scrolling
 * a one-line slot. Measured, not assumed.
 *
 * Height is cleared before reading scrollHeight so the field shrinks when text
 * is deleted, and `max-height` in CSS caps it at about half the screen; past
 * that the field scrolls internally and the question above and the button below
 * stop moving.
 */
function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

/* ── paragraph and short_text ─────────────────────────────────────── */

function TextAnswer({ question, value, onChange, onEnter, total }: Props) {
  const text = typeof value === 'string' ? value : '';
  const long = question.type === 'paragraph';
  const id = useId();
  const t = useText();
  const placeholder = t('Type your answer here...', 'พิมพ์คำตอบของคุณที่นี่...');

  const box = useAutosize(text);

  const advance = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    /* On a touch keyboard Return is how you make a line break, and there is no
       Shift to hold. Enter only advances where a real keyboard is attached —
       which is also the only place the hint beside OK is shown. */
    if (long && window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    (e.target as HTMLElement).blur();
    onEnter?.();
  };

  return (
    <div className="sq">
      <label htmlFor={id}>
        <Heading question={question} total={total} />
      </label>
      <Alt question={question} />
      {long ? (
        <textarea
          id={id}
          ref={box}
          className="textarea"
          rows={1}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={advance}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={advance}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

/**
 * The identity block's name and email. Unnumbered, compact, side by side — the
 * layout in reference/designally-app.html step 1.
 */
export function IdentityField({ question, value, onChange, onEnter }: Props) {
  const text = typeof value === 'string' ? value : '';
  const id = useId();
  const t = useText();
  const other = useOtherText();
  /* An email field typed on a phone deserves the @ keyboard and no
     autocapitalise — the first character is otherwise a capital every time. */
  const email = question.config.maps_to === 'email';
  const help = t(question.helpEn, question.helpTh);

  return (
    <div>
      <label className="f" htmlFor={id}>
        {t(question.textEn, question.textTh)}{' '}
        <span>· {other(question.textEn, question.textTh)}</span>
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
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          (e.target as HTMLElement).blur();
          onEnter?.();
        }}
      />
      {email && help && <span className="fhelp">{help}</span>}
    </div>
  );
}

/* ── multiple_choice ──────────────────────────────────────────────── */

function ChoiceAnswer({ question, value, onChange, total }: Props) {
  const v = (value ?? { choice: '' }) as { choice: string; other?: string };
  const config = question.config;
  const name = useId();
  const t = useText();

  const pick = (choice: string) =>
    onChange((prev) => {
      const current = (prev ?? { choice: '' }) as { choice: string; other?: string };
      return { ...current, choice };
    });

  return (
    <fieldset className="sq">
      <legend>
        <Heading question={question} total={total} />
      </legend>
      <Alt question={question} />
      <div className="pick">
        {(config.choices ?? []).map((c) => (
          <label key={c.en} className={`pickone${v.choice === c.en ? ' sel' : ''}`}>
            <input type="radio" name={name} checked={v.choice === c.en} onChange={() => pick(c.en)} />
            <span>
              <b>{c.en}</b>
              <span className="pth th">{c.th}</span>
            </span>
          </label>
        ))}

        {config.other && (
          <label className={`pickone${v.choice === OTHER ? ' sel' : ''}`}>
            <input type="radio" name={name} checked={v.choice === OTHER} onChange={() => pick(OTHER)} />
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
            placeholder={t('Please tell us', 'โปรดระบุ')}
            aria-label={t('Other, please tell us', 'อื่น ๆ โปรดระบุ')}
          />
        </div>
      )}
    </fieldset>
  );
}

/* ── checkboxes ───────────────────────────────────────────────────── */

/**
 * A list of short labels reads as chips, not as a stack of full-width rows.
 *
 * Eight avoid-options set as rows ran a 390px slide to 1,080px — one line of
 * text per 60px band, most of each band empty. As chips they wrap two and three
 * to a line and the question fits the screen it is asked on. The threshold used
 * to be twelve choices, which nothing in the questionnaire ever reached.
 *
 * Choices carrying an image are the exception and stay boards: the picture is
 * the answer there, and it cannot wrap into a pill.
 */
function asChips(config: QuestionConfig) {
  const choices = config.choices ?? [];
  return choices.length > 0 && !choices.some((c) => c.image);
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

function CheckboxAnswer({ question, value, onChange, total }: Props) {
  const v = (value ?? { choices: [] }) as { choices: string[]; other?: string };
  const config = question.config;
  const chosen = new Set(v.choices);
  const max = config.max;
  const min = config.min;
  const atMax = typeof max === 'number' && v.choices.length >= max;
  const t = useText();

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
        <Heading question={question} total={total} />
      </legend>
      <Alt question={question} />

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
                <b>{o.en}</b>
                <small className="th">{o.th}</small>
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
                    sizes="(max-width: 620px) 46vw, 210px"
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
          {t(
            `Selected ${v.choices.length}${typeof max === 'number' ? ` of ${max}` : ''}`,
            `เลือกแล้ว ${v.choices.length}${typeof max === 'number' ? ` จาก ${max}` : ''} คำ`,
          )}
        </p>
      )}

      {config.other && chosen.has(OTHER) && (
        <div className="otherwrap">
          <input
            type="text"
            className="input"
            value={v.other ?? ''}
            onChange={(e) => onChange({ ...v, other: e.target.value })}
            placeholder={t('Please tell us', 'โปรดระบุ')}
            aria-label={t('Other, please tell us', 'อื่น ๆ โปรดระบุ')}
          />
        </div>
      )}
    </fieldset>
  );
}

/* ── linear_scale ─────────────────────────────────────────────────── */

function ScaleAnswer({ question, value, onChange, total, slice }: Props) {
  const v = (value ?? { scale: {} }) as { scale: Record<string, number> };
  const points = question.config.points ?? 5;
  /* Version 1 scales run 1..points; the version-2 personality scales run 0..10,
     where 0 is a position and not an absence of one. */
  const start = question.config.start ?? 1;
  const all = question.config.pairs ?? [];
  /* The slice this slide shows. Indices stay the battery's own, so every part
     writes into the same answer under the same keys — split for reading, whole
     in the database. */
  const from = slice?.from ?? 0;
  const pairs = all.slice(from, slice?.to ?? all.length);
  /* more points than fit one row of 44px targets on a 390px screen */
  const wide = points > 7;

  // functional, so ten pairs answered in quick succession all survive
  const set = (index: number, point: number) =>
    onChange((prev) => {
      const current = (prev ?? { scale: {} }) as { scale: Record<string, number> };
      return { scale: { ...current.scale, [String(index)]: point } };
    });

  return (
    <div className="sq scalesq">
      {/* Ten scales sharing one rating is a battery, not ten questions: it is
          answered by calibrating once and rating quickly. So they stay on one
          slide and the question stays pinned while they scroll under it —
          rating the eighth pair with no idea what is being rated is the failure
          mode this avoids. */}
      <div className="scalehead">
        <Heading question={question} total={total} />
        <Alt question={question} />
        {slice && slice.parts > 1 && (
          <p className="qpart">
            Part {slice.part} of {slice.parts}
          </p>
        )}
      </div>
      {pairs.map((p, offset) => {
        const i = from + offset;
        return (
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
        );
      })}
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
