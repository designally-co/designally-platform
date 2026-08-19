import { notFound } from 'next/navigation';

import { loadSurvey } from '@/lib/survey/load';
import SurveyForm from './survey-form';
import Closed from './closed';
import NotReady from './not-ready';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: PageProps<'/s/[token]'>) {
  const { token } = await props.params;
  const survey = await loadSurvey(token);
  return {
    title: survey ? `${survey.clientName} · Designally` : 'Designally',
    robots: { index: false, follow: false },
  };
}

export default async function SurveyPage(props: PageProps<'/s/[token]'>) {
  const { token } = await props.params;
  const survey = await loadSurvey(token);

  if (!survey) notFound();
  /* No precedence between them any more, because the screen no longer differs:
     archived, closed by hand and past its date are one state to whoever is
     holding the link, and rule 1 says so. The ternary that ranked them was
     picking between three sentences that had stopped being three things. */
  if (survey.closed || survey.archived || survey.overdue) {
    return <Closed clientName={survey.clientName} />;
  }

  /**
   * A survey that resolves to no questions must never be shown to a client.
   *
   * It happened: the version-2 code shipped before the version-2 questions were
   * imported, so a new survey asked for a question version the database did not
   * have. The welcome screen said "0 questions", Continue went straight to the
   * thank-you, and the client would have believed they had answered. Nothing
   * was written, and nobody would have known to look.
   *
   * Failing visibly is the only acceptable behaviour here — the team can fix a
   * link, but cannot fix a stakeholder who thinks they are done.
   */
  if (survey.questionCount === 0) return <NotReady clientName={survey.clientName} />;

  return <SurveyForm survey={survey} />;
}
