import { redirect } from 'next/navigation';

import { auth, signOut } from '@/auth';
import { loadQuestionLibrary } from '@/lib/team/library';
import { formatToday, loadProjects } from '@/lib/team/projects';
import Today from './today';

export const dynamic = 'force-dynamic';

/**
 * The team app is one page. There are no tabs and no sidebar — navigation holds
 * places you can go, and this product has one place. Everything else is a panel
 * opened from here (docs/navigation-decisions.md).
 */
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const [live, archived, library] = await Promise.all([
    loadProjects({ archived: false }),
    loadProjects({ archived: true }),
    loadQuestionLibrary(),
  ]);

  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }

  return (
    <Today
      today={formatToday()}
      live={live}
      archived={archived}
      library={library}
      signOut={signOutAction}
    />
  );
}
