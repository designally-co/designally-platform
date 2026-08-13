/**
 * A survey stops taking answers for one of two reasons, both of them a person's
 * doing (rule 1): somebody closed collection — gate 1 — or somebody archived
 * the project — gate 4. Say so plainly rather than showing a broken form.
 *
 * One screen, because the respondent does not need the distinction; one
 * sentence differs, because telling somebody the team "has moved on to the
 * analysis" about a project that finished months ago is not true.
 */
export default function Closed({
  clientName,
  reason = 'closed',
}: {
  clientName: string;
  reason?: 'closed' | 'finished';
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
          <h1>This questionnaire is closed.</h1>
          <p className="th" style={{ marginBottom: 26 }}>
            แบบสอบถามนี้ปิดรับคำตอบแล้ว
          </p>
          <p className="intro">
            {reason === 'finished'
              ? 'This project has already finished. If you think your perspective is missing, please contact your project lead.'
              : 'The Designally team has everything they need and has moved on to the analysis. If you think your perspective is missing, please contact your project lead.'}
          </p>
          <p className="th" style={{ maxWidth: '58ch' }}>
            {reason === 'finished'
              ? 'โปรเจกต์นี้เสร็จสิ้นแล้ว หากคุณต้องการเพิ่มความเห็น กรุณาติดต่อผู้ดูแลโปรเจกต์'
              : 'ทีมงานได้ปิดรับคำตอบแล้ว หากคุณต้องการเพิ่มความเห็น กรุณาติดต่อผู้ดูแลโปรเจกต์'}
          </p>
        </div>
      </div>
    </div>
  );
}
