import type { AnswerValue } from '@/lib/db/schema';
import type { ProjectAnswers, ReadableAnswer, RespondentAnswers } from './answers';
import { oneLine } from './words';

/**
 * The answers as a file somebody can keep.
 *
 * The platform's job ends at a confirmed summary and this does not extend it —
 * it is the same answers the team already reads on screen, in a form that
 * survives leaving the app. A designer opens the file on a train; a strategist
 * pastes a paragraph into a deck; somebody who has left the company is still
 * findable in a folder. None of that is served by a screen behind Google OAuth.
 *
 * **Markdown, not CSV.** These are paragraphs, choices and scales, not a table.
 * A CSV of twenty-one long free-text answers is a spreadsheet nobody can read
 * and a quoting problem in two scripts.
 *
 * Bilingual, and the Thai kept. The team reads English, but the *answers* are
 * often Thai and the question they belong to has to travel with them — a file
 * showing an English question over a Thai answer is unreadable to the one
 * person most likely to be asked what it means.
 *
 * Pure, and given nothing but what the sheet already holds. It runs in the
 * browser off the loaded `ProjectAnswers`, so exporting costs no request and
 * cannot show something different from what is on screen.
 */

/* ── shared with the sheet ───────────────────────────────────────────── */

/**
 * Which end of a scale a point counts from, in words.
 *
 * The same three readings the sheet renders, and deliberately the same
 * function: a file that said something different from the screen about the same
 * answer would be worse than no file. See `answers.tsx` for why there are three
 * and no degree words.
 */
export function scaleReading(point: number, points: number, leftEn: string, rightEn: string) {
  if (point <= 1) return `at ${leftEn}`;
  if (point >= points) return `at ${rightEn}`;
  if (points % 2 === 1 && point === (points + 1) / 2) return 'balanced';
  return point < (points + 1) / 2 ? `toward ${leftEn}` : `toward ${rightEn}`;
}

/* ── the document ────────────────────────────────────────────────────── */

const stamp = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Markdown's own escapes, on text a client typed.
 *
 * A brand called `**ARUN**` or a note using a `#` would otherwise re-render as
 * markup in whatever opens the file. Only the characters that begin a construct
 * at the start of a line, plus the inline pair — enough to keep meaning, short
 * of turning ordinary punctuation into backslashes.
 */
const esc = (s: string) => s.replace(/([\\`*_[\]#])/g, '\\$1');

function valueToMd(value: AnswerValue, pairs: ReadableAnswer['pairs']): string {
  switch (value.kind) {
    case 'text':
      /* the client's own paragraphs, kept as they wrote them — a blank line
         between them, because a single newline is not one in Markdown */
      return value.text
        .split(/\n{2,}/)
        .map((p) => esc(p.trim()))
        .filter(Boolean)
        .join('\n\n');
    case 'choice':
      return value.other ? `${esc(value.choice)} — ${esc(value.other)}` : esc(value.choice);
    case 'multi': {
      const chosen = value.choices.map((c) => `- ${esc(c)}`).join('\n');
      return value.other ? `${chosen}\n- ${esc(value.other)}` : chosen;
    }
    case 'scale': {
      /* A table, because ten scales are the one answer here that *is* tabular:
         same three columns every row, and the point is what gets compared down
         the column. The reading is spelled out rather than left to the number,
         for the reason it is on screen — "2 of 5" says nothing about which end
         it counts from. */
      const rows = Object.entries(value.values)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([index, point]) => {
          const pair = pairs?.[Number(index)];
          const name = pair ? `${pair.left_en} – ${pair.right_en}` : `pair ${Number(index) + 1}`;
          const reading = pair
            ? scaleReading(point, value.points, pair.left_en, pair.right_en)
            : '—';
          return `| ${esc(name)} | ${point} of ${value.points} | ${reading} |`;
        });
      return ['| Scale | Point | Reading |', '|---|---|---|', ...rows].join('\n');
    }
  }
}

function answerToMd(a: ReadableAnswer): string {
  const head = `### ${a.number !== null ? `${a.number}. ` : ''}${esc(oneLine(a.textEn))}`;
  /* the Thai on its own line under the English, italic — it is the same
     question, not a second one */
  const th = a.textTh ? `\n*${esc(oneLine(a.textTh))}*` : '';
  const body = a.value ? valueToMd(a.value, a.pairs) : '*Left blank.*';
  return `${head}${th}\n\n${body}`;
}

function personToMd(p: RespondentAnswers): string {
  const who = [p.role, p.email].filter(Boolean).join(' · ');
  const lines = [
    `## ${esc(p.name)}`,
    who ? `${esc(who)}` : null,
    `Answered ${stamp(new Date(p.submittedAt))} · ${p.answered} answered${
      p.blank > 0 ? ` · ${p.blank} left blank` : ''
    }`,
  ].filter(Boolean);
  return [...lines, '', p.answers.map(answerToMd).join('\n\n')].join('\n');
}

/**
 * One respondent, or everybody.
 *
 * The version is on the file because it is the only thing that explains why two
 * exports of the same project can hold different questions — a survey keeps the
 * questions it was sent with (rule 5), and a file with no version on it is a
 * file nobody can place a year from now.
 *
 * No count of how many were expected, and no fraction: collection is
 * open-ended (rule 3). "3 answers" is what there is.
 */
export function answersToMarkdown(
  data: ProjectAnswers,
  clientName: string,
  only?: RespondentAnswers,
): string {
  const people = only ? [only] : data.respondents;
  const title = only ? `${clientName} — ${only.name}` : clientName;
  const head = [
    `# ${esc(title)}`,
    '',
    only
      ? `Discovery answers · question set version ${data.questionVersion}`
      : `Discovery answers · ${people.length} ${
          people.length === 1 ? 'respondent' : 'respondents'
        } · question set version ${data.questionVersion}`,
    `Exported ${stamp(new Date())}`,
  ];
  return [...head, '', people.map(personToMd).join('\n\n---\n\n'), ''].join('\n');
}

/**
 * `arun-somchai-jaidee.md`, and `arun-มาลี-ใจดี.md` when the name is Thai.
 *
 * `\p{M}` is in the keep set, and that is the whole reason this has a comment.
 * Thai tone marks and vowel signs are nonspacing marks, not letters, so a slug
 * keeping `\p{L}\p{N}` alone strips them and hands somebody a file named after
 * a misspelling of themselves — มาลี ใจดี came out `มาล-ใจด`. It is silent, it
 * only happens to Thai names, and nobody reading the Latin ones would ever see
 * it.
 */
export function exportFilename(clientName: string, person?: RespondentAnswers): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
      .replace(/^-|-$/g, '');
  const parts = [slug(clientName), person ? slug(person.name) : 'all-answers'].filter(Boolean);
  return `${parts.join('-') || 'answers'}.md`;
}

/* ── the printed document ────────────────────────────────────────────── */

/**
 * The same answers as a document to print, which is this product's PDF.
 *
 * **No PDF library, and that is a decision.** Every one of them would mean
 * embedding a Thai face and shaping it ourselves, and Thai shaping is exactly
 * where they fail: tone marks and lower vowels land on the wrong side of a
 * glyph or on top of each other. The failure is invisible to anybody who cannot
 * read the script, which on this team is most of the people who would generate
 * the file. The browser has already shaped every Thai line on the screen
 * correctly. Handing it a document and calling `print()` is the one route to a
 * PDF guaranteed right in any script, with no dependency and nothing to keep in
 * step.
 *
 * **Its own window, not the sheet with its chrome hidden.** That was the first
 * attempt and it fails twice. The `<dialog>` is rendered where the sheet is
 * used rather than portalled to `document.body`, so the usual
 * `body > * { display: none }` isolation hides one of its ancestors and takes
 * the dialog with it — a blank page, discovered only by whoever pressed print.
 * And the honest version of the same objection: a de-chromed app screen is a
 * poor document. It carries a screen's measure, a screen's leading, and a
 * scroll container's assumptions. A page ends, and has to say on every one of
 * them whose answers these are.
 *
 * The face is the system stack rather than the CI's. `next/font` scopes its
 * families to the app's own document, and a window built from a string cannot
 * see them; naming a Thai-capable stack is what keeps the script correct, which
 * is the constraint that outranks the brand on an internal working document
 * nobody sends to a client.
 */
function esc5(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valueToHtml(value: AnswerValue, pairs: ReadableAnswer['pairs']): string {
  switch (value.kind) {
    case 'text':
      return value.text
        .split(/\n{2,}/)
        .map((t) => `<p>${esc5(t.trim())}</p>`)
        .join('');
    case 'choice':
      return `<p><b>${esc5(value.choice)}</b>${
        value.other ? ` — ${esc5(value.other)}` : ''
      }</p>`;
    case 'multi':
      return `<ul class="chips">${[...value.choices, ...(value.other ? [value.other] : [])]
        .map((c) => `<li>${esc5(c)}</li>`)
        .join('')}</ul>`;
    case 'scale': {
      const rows = Object.entries(value.values)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([index, point]) => {
          const pair = pairs?.[Number(index)];
          const name = pair
            ? `${esc5(pair.left_en)} – ${esc5(pair.right_en)}`
            : `pair ${Number(index) + 1}`;
          const reading = pair
            ? esc5(scaleReading(point, value.points, pair.left_en, pair.right_en))
            : '';
          return `<tr><td class="sc-pair">${name}</td><td class="sc-pos"><b>${point}</b> of ${value.points}</td><td class="sc-lean">${reading}</td></tr>`;
        })
        .join('');
      return `<table class="scale">${rows}</table>`;
    }
  }
}

function personToHtml(p: RespondentAnswers): string {
  const who = [p.role, p.email].filter((x): x is string => !!x).map(esc5).join(' · ');
  const answers = p.answers
    .map(
      (a) => `<section class="qa">
        <h3>${a.number !== null ? `<span class="n">${a.number}</span>` : '<span class="n"></span>'}<span class="qt">${esc5(
          a.textEn,
        )}${a.textTh ? `<i>${esc5(a.textTh)}</i>` : ''}</span></h3>
        <div class="ans">${a.value ? valueToHtml(a.value, a.pairs) : '<p class="blank">Left blank.</p>'}</div>
      </section>`,
    )
    .join('');
  return `<article class="person">
    <header><h2>${esc5(p.name)}</h2>${who ? `<p class="who">${who}</p>` : ''}
    <p class="who">Answered ${stamp(new Date(p.submittedAt))} · ${p.answered} answered${
      p.blank > 0 ? ` · ${p.blank} left blank` : ''
    }</p></header>${answers}</article>`;
}

/** A complete, self-contained document — no request, no asset, nothing to load. */
export function printableHtml(
  data: ProjectAnswers,
  clientName: string,
  only?: RespondentAnswers,
): string {
  const people = only ? [only] : data.respondents;
  const title = only ? `${clientName} — ${only.name}` : clientName;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc5(title)}</title>
<style>
  /* A Thai-capable stack, named first, because the script is the constraint
     this whole approach exists to protect. */
  :root { --doc: "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, -apple-system, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--doc); color: #14161a; background: #fff;
         /* 1.6 on every line, because any line here can carry Thai and Thai
            stacks four levels — DESIGN.md section 2. */
         line-height: 1.6; font-size: 10.5pt; }
  .doc { max-width: 172mm; margin: 0 auto; padding: 14mm 0; }
  h1 { font-size: 19pt; line-height: 1.25; margin: 0 0 2mm; font-weight: 600; letter-spacing: -0.01em; }
  .meta { color: #5a5e66; font-size: 9pt; margin: 0 0 10mm; }
  /* one respondent per page: losing track of whose answers these are halfway
     down a page is what makes a printed set unreadable */
  .person { break-before: page; }
  .person:first-of-type { break-before: auto; }
  .person > header { border-bottom: 0.5pt solid #b9bcc2; padding-bottom: 3mm; margin-bottom: 7mm; }
  h2 { font-size: 14pt; margin: 0 0 1mm; font-weight: 600; }
  .who { color: #5a5e66; font-size: 9pt; margin: 0; }
  /* a question and its answer are one thing */
  .qa { break-inside: avoid; margin: 0 0 7mm; }
  .qa h3 { display: flex; gap: 5mm; font-size: 10.5pt; font-weight: 600; margin: 0 0 2mm; }
  .qa h3 .n { flex: none; width: 7mm; color: #85888f; font-weight: 400; text-align: right; }
  .qa h3 .qt { flex: 1; }
  .qa h3 i { display: block; font-style: normal; font-weight: 400; color: #5a5e66; }
  .ans { margin-left: 12mm; }
  .ans p { margin: 0 0 2mm; }
  .blank { color: #85888f; font-style: italic; }
  .chips { margin: 0; padding-left: 5mm; }
  .scale { border-collapse: collapse; break-inside: avoid; }
  .scale td { padding: 0.6mm 0; vertical-align: baseline; }
  .sc-pair { color: #5a5e66; padding-right: 8mm !important; }
  .sc-pos { white-space: nowrap; color: #5a5e66; padding-right: 8mm !important; }
  .sc-pos b { color: #14161a; font-weight: 600; }
  .sc-lean { }
  @page { margin: 14mm 15mm; }
  @media print { .doc { padding: 0; max-width: none; } }
</style></head><body><div class="doc">
<h1>${esc5(title)}</h1>
<p class="meta">Discovery answers${
    only ? '' : ` · ${people.length} ${people.length === 1 ? 'respondent' : 'respondents'}`
  } · question set version ${data.questionVersion} · exported ${stamp(new Date())}</p>
${people.map(personToHtml).join('')}
</div></body></html>`;
}
