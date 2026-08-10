'use client';

import { QUESTION_TYPE_LABEL, type LibraryBlock } from '@/lib/team/library-types';
import Sheet from './sheet';

/**
 * Read-only until milestone 6. The questions live in seed/question-blocks.json
 * and are imported by `npm run db:seed`; this shows the team what a client is
 * actually asked, and which packages ask it.
 */
export default function TemplatesSheet({
  library,
  onClose,
}: {
  library: LibraryBlock[];
  onClose: () => void;
}) {
  return (
    <Sheet title="Question templates" onClose={onClose}>
      <p className="vrule">
        <b>Editing arrives in milestone 6.</b> Until then the questions live in the seed file. When
        the editor lands, changes will apply to future surveys only — anything already sent keeps
        its own version, so answers always match the questions that were asked. ·
        การแก้ไขมีผลกับแบบสอบถามใหม่เท่านั้น
      </p>

      {library.map((block) => (
        <section className="tplblock" key={block.key}>
          <div className="tplhead">
            <h3>
              {block.nameEn} <span className="th">· {block.nameTh}</span>
            </h3>
            <span className="m">
              {block.questions.length} questions · {block.usedBy}
            </span>
          </div>

          <div className="qwrap">
            {block.questions.map((q) => (
              <div className="q" key={q.order}>
                <span className="num">{q.order}</span>
                <div className="txt">
                  {q.textEn}
                  <span className="th">{q.textTh}</span>
                  {q.settings && <span className="cfg">{q.settings}</span>}
                </div>
                <span className="qtype">{QUESTION_TYPE_LABEL[q.type]}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  );
}
