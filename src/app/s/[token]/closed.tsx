/**
 * A survey is closed only when a person on the team closed it (rule 1, gate 1).
 * Say so plainly rather than showing a broken form.
 */
export default function Closed({ clientName }: { clientName: string }) {
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
            The Designally team has everything they need and has moved on to the analysis. If you
            think your perspective is missing, please contact your project lead — they can reopen
            it.
          </p>
          <p className="th" style={{ maxWidth: '58ch' }}>
            ทีมงานได้ปิดรับคำตอบแล้ว หากคุณต้องการเพิ่มความเห็น กรุณาติดต่อผู้ดูแลโปรเจกต์
          </p>
        </div>
      </div>
    </div>
  );
}
