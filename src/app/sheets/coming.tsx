'use client';

import Sheet from './sheet';

/**
 * What the tool does not do yet, said plainly. The build order is the one in
 * docs/first-session-insights.md; each milestone is used on a real project before
 * the next one starts.
 */
const ITEMS: { title: string; state: 'live' | 'next' | 'later'; body: string; where: string }[] = [
  {
    title: 'The survey',
    state: 'live',
    body: 'One bilingual link per project, shared as widely as the client likes. Answers save as people go and arrive here as they submit.',
    where: 'Where it lives: the New survey button · every row in All projects.',
  },
  {
    title: 'The insights write themselves',
    state: 'next',
    body: 'Closing collection will run the analysis: what the stakeholders agree on, where they contradict each other, and what the client has not decided yet. No percentages, no sentiment scores — three to twenty people cannot support them.',
    where: 'Where it will plug in: the Close collection button, which today only records that you closed it.',
  },
  {
    title: 'The human gate and the decisions',
    state: 'later',
    body: 'Reading and confirming the insights, the deck handoff, and recording what the room actually decided — including "still open", because pretending a decision happened is worse than recording that it did not.',
    where: 'Where it will plug in: Needs you, after the insights exist.',
  },
  {
    title: 'The website track',
    state: 'later',
    body: 'A second, shorter survey establishing who produces each part of the site content, and by when. It cannot be sent before the kick-off decisions are recorded — what was decided changes what content is needed.',
    where: 'Where it will plug in: after decisions exist, on website and both projects.',
  },
  {
    title: 'The template editor',
    state: 'later',
    body: 'Editing the questions in the app, in both languages. A survey already sent keeps the version it was sent with.',
    where: 'Where it will plug in: the Question templates panel, which is read-only today.',
  },
];

const TAG: Record<string, string> = { live: 'LIVE', next: 'NEXT', later: 'LATER' };

export default function ComingSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="What's coming" onClose={onClose}>
      <p className="lede">
        Each one is used on a real project before the next is started. That order is deliberate —
        the risk is not that the code fails, it is building all of it before using any of it.
      </p>

      <div className="rmlist">
        {ITEMS.map((item) => (
          <div className={`rm${item.state === 'live' ? ' live' : ''}`} key={item.title}>
            <div className="rmtop">
              <b>{item.title}</b>
              <span className={`rmtag${item.state === 'live' ? ' on' : ''}`}>
                {TAG[item.state]}
              </span>
            </div>
            <p>{item.body}</p>
            <p className="where">{item.where}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
