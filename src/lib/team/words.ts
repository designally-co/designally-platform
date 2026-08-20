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
