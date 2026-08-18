/**
 * When a response was submitted.
 *
 * Date *and* time, not a relative "2 days ago": five responses to one survey
 * arrive within a week of each other, and "3 days ago" against "4 days ago" is
 * harder to order at a glance than two dates.
 *
 * **Formatted in the browser, and that is the whole reason this is not done
 * server-side with the rest of `ProjectView`'s dates.** `toLocaleString` reads
 * the timezone of whatever runs it; on Vercel that is UTC, and Bangkok is seven
 * hours ahead — so an answer submitted at 9am would be filed at 2am the same
 * day, and one submitted before 7am would be filed on the day before. Every
 * caller is a client component, so this runs where the team is.
 *
 * Shared because it was written twice: the answers sheet's bar and the project
 * sheet's list of respondents are the same fact about the same row, and two
 * copies is how they drift into two formats.
 */
export function submitted(at: Date | string) {
  return new Date(at).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
