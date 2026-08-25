/**
 * Sentence pieces the team app builds strings from.
 *
 * Its own file because `today.tsx` is a client component and `projects.ts` —
 * where `plural` lived — imports the database. A value imported from there
 * pulls `postgres-js` into the browser graph and the build stops on `Can't
 * resolve 'fs'`; a type imported from there is erased and costs nothing, which
 * is why `ProjectView` was never a problem.
 *
 * Nothing in here may import anything that touches the database, the
 * filesystem, or `process.env`.
 */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * The question as one line, wherever a line is what the format has.
 *
 * Some question texts carry newlines so the *client* can read a multi-part
 * question one part per line — see `white-space: pre-line` on `.slide .qq`.
 * Nothing else wants them. The Markdown export puts the text inside a `###`
 * heading, where a newline ends the heading and drops the rest into the body,
 * and the analysis transcript is line-based `Q: …` / `A: …`, where a newline
 * inside the question makes the answer look like it belongs to something else.
 *
 * The team's screens need no help: HTML collapses whitespace on its own, and
 * only the two client rules opt out of that.
 */
export function oneLine(s: string) {
  return s.replace(/\s*\n\s*/g, ' ').trim();
}
