import { redirect } from 'next/navigation';

import { auth, signOut } from '@/auth';
import { loadQuestionLibrary } from '@/lib/team/library';
import { loadProjects } from '@/lib/team/projects';
import { surveyOrigin } from '@/lib/survey/origin';
import Today from './today';

export const dynamic = 'force-dynamic';

/**
 * Closing collection runs the analysis inside this request, and two passes of
 * Claude Opus 5 take around three minutes on a five-person survey. The default
 * serverless timeout kills that well before it finishes, so the ceiling is
 * raised here — server actions run in the route that invoked them.
 *
 * 300s is the practical maximum on Vercel Pro. If a survey ever runs past it,
 * the analysis has to move to a background job rather than have this number
 * raised again; the request/response shape is the wrong home for work that
 * long, and the effort setting in lib/analysis/run.ts is the first lever.
 */
export const maxDuration = 300;

/**
 * The team app is one page. There are no tabs and no sidebar — navigation holds
 * places you can go, and this product has one place. Everything else is a panel
 * opened from here (docs/navigation-decisions.md).
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const [live, archived, library, origin] = await Promise.all([
    loadProjects({ archived: false }),
    loadProjects({ archived: true }),
    loadQuestionLibrary(),
    surveyOrigin(),
  ]);

  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }

  return (
    <Today
      /* Read in Settings and nowhere else — the toolbar shows the Designally
         mark, not the person. The display name went with the sheet's headings
         on 20 August 2026; the address is what answers "which account is this?"
         See sheets/settings.tsx. */
      user={{ email: session.user.email ?? null }}
      live={live}
      archived={archived}
      library={library}
      origin={origin}
      signOut={signOutAction}
    />
  );
}
