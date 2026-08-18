/**
 * A survey stops taking answers for three reasons now: somebody closed
 * collection — gate 1 — somebody archived the project — gate 4 — or the date
 * the team asked for has passed. Say so plainly rather than showing a broken
 * form.
 *
 * One screen, because the respondent does not need to know which; one sentence
 * differs, because telling somebody the team "has moved on to the analysis"
 * about a project that finished months ago is not true, and telling somebody
 * whose only problem is a date that the team has everything they need is worse
 * — it reads as "do not bother", when the answer is a message and a new date.
 *
 * **`due` is the one that asks for a reply.** The other two are the team having
 * finished with them; this one is a door they can have opened. So it names the
 * thing to do rather than leaving them to work out that contacting anybody
 * would help.
 */
export default function Closed({
  clientName,
  reason = 'closed',
}: {
  clientName: string;
  reason?: 'closed' | 'finished' | 'due';
}) {
  return (
    <div className="survey-shell client-surface">
      <div className="sform">
        <div className="head">
          <span className="wordmark">
            Design<em>ally</em>
          </span>
          <span className="proj">{clientName}</span>
        </div>
        <div className="step">
          <h1>
            {reason === 'due'
              ? 'The date for this questionnaire has passed.'
              : 'This questionnaire is closed.'}
          </h1>
          <p className="th" style={{ marginBottom: 26 }}>
            {reason === 'due' ? 'แบบสอบถามนี้เลยกำหนดวันตอบแล้ว' : 'แบบสอบถามนี้ปิดรับคำตอบแล้ว'}
          </p>
          <p className="intro">
            {reason === 'due'
              ? 'Please contact your project lead at Designally and they can open it again for you.'
              : reason === 'finished'
                ? 'This project has already finished. If you think your perspective is missing, please contact your project lead.'
                : 'The Designally team has everything they need and has moved on to the analysis. If you think your perspective is missing, please contact your project lead.'}
          </p>
          <p className="th" style={{ maxWidth: '58ch' }}>
            {reason === 'due'
              ? 'กรุณาติดต่อผู้ดูแลโปรเจกต์ที่ Designally เพื่อขอเปิดแบบสอบถามอีกครั้ง'
              : reason === 'finished'
                ? 'โปรเจกต์นี้เสร็จสิ้นแล้ว หากคุณต้องการเพิ่มความเห็น กรุณาติดต่อผู้ดูแลโปรเจกต์'
                : 'ทีมงานได้ปิดรับคำตอบแล้ว หากคุณต้องการเพิ่มความเห็น กรุณาติดต่อผู้ดูแลโปรเจกต์'}
          </p>
        </div>
      </div>
    </div>
  );
}
