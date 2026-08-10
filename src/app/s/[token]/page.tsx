import { notFound } from 'next/navigation';

import { loadSurvey } from '@/lib/survey/load';
import SurveyForm from './survey-form';
import Closed from './closed';

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
  if (survey.closed) return <Closed clientName={survey.clientName} />;

  return <SurveyForm survey={survey} />;
}
