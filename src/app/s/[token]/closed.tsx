import Rail from './rail';
import { Masthead } from './questions';

/**
 * A survey stops taking answers for three reasons now: somebody closed
 * collection — gate 1 — somebody archived the project — gate 4 — or the date
 * the team asked for has passed. Say so plainly rather than showing a broken
 * form.
 *
 * **It is built like the rest of the survey, from 19 August 2026.** It was the
 * last screen still wearing the questionnaire's old chrome — a `DESIGNALLY.`
 * wordmark that appears on no other screen, the client name beside it, and a
 * flat left column with no Cut and no Point anywhere on it. The survey it
 * belongs to grew a masthead, a vertical Cut and a disc at its head, and this
 * screen did not come with it. A client who follows their link a day late is
 * not shown a different product; they get the same page, holding a different
 * sentence.
 *
 * **The mark is on the disc, which is otherwise a welcome-only thing.** The
 * argument in `rail.tsx` is that the welcome is the first thing a client ever
 * sees of Designally and the one place a brand mark does a job rather than
 * decorating a counter. This screen has exactly that property and a harder
 * version of it: for somebody who arrives after the door shut, it is the *only*
 * thing they ever see, and the one instruction on it is to go and find a person
 * at Designally. There is no count to hold either way.
 *
 * **One heading, three sentences under it.** `due` said "The date for this
 * questionnaire has passed" while the other two said "closed" — but rule 1
 * settled on 19 August that closed means no answer is accepted and that a date
 * arriving and a person pressing the button are the same event to whoever is
 * holding the link. The client meets the same screen either way, so the app
 * says the same word either way.
 *
 * The sentence under it still differs, because the three are not the same
 * *situation*. Telling somebody whose only problem is a date that the team has
 * everything they need reads as "do not bother", when the answer is a message
 * and a new date.
 *
 * **`due` is the one that asks for a reply.** The other two are the team having
 * finished with them; this one is a door they can have opened. So it names the
 * thing to do rather than leaving them to work out that contacting anybody
 * would help.
 *
 * **None of them says what the team is doing** — 19 August 2026, asked for.
 * `closed` opened "The team has what they need and has started the analysis",
 * which is two clauses of Designally's internal sequence spent on a person who
 * cannot act on any of it. The client's only move is the same in all three, so
 * that is the whole sentence. It is rule 8's reasoning one step out from the
 * insights: a client-facing surface owes them what they can do, not what we are
 * doing.
 */
export default function Closed({
  clientName,
  reason = 'closed',
}: {
  clientName: string;
  reason?: 'closed' | 'finished' | 'due';
}) {
  const body = BODY[reason];

  return (
    <div className="survey-shell client-surface">
      <Rail n={0} total={0} mark />
      <Masthead
        counted={false}
        count={{ n: 0, total: 0 }}
        mark
        /* what the welcome puts here is how long this will take; what this
           screen owes somebody who followed a link that no longer works is
           which project it was, so they know the link itself was right and
           they are only late */
        lead={<span className="qwhen">{clientName}</span>}
      />
      <div className="slide" data-screen="closed" data-active="" data-dir="next">
        <div className="slidebody">
          <div className="slidemain">
            <h1>
              This questionnaire is closed.
              <span className="th">แบบสอบถามนี้ปิดรับคำตอบแล้ว</span>
            </h1>
            <p className="intro">
              {body.en}
              <span className="th">{body.th}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Shorter than they were. At the display size this screen now sets, the old
   two-clause sentences ran five lines in English and five again in Thai on a
   phone, for a screen whose whole content is one fact and one instruction. */
const BODY = {
  due: {
    en: 'Your project lead at Designally can open it again for you.',
    th: 'ผู้ดูแลโปรเจกต์ที่ Designally สามารถเปิดให้ใหม่ได้',
  },
  closed: {
    en: 'If your perspective is missing, tell your project lead.',
    th: 'หากยังขาดความเห็นของคุณ กรุณาแจ้งผู้ดูแลโปรเจกต์',
  },
  finished: {
    en: 'This project has finished. If your perspective is missing, tell your project lead.',
    th: 'โปรเจกต์นี้เสร็จสิ้นแล้ว หากยังขาดความเห็นของคุณ กรุณาแจ้งผู้ดูแลโปรเจกต์',
  },
} as const;
