'use client';

import { useTransition } from 'react';

import { restoreProject } from '@/lib/team/actions';
import type { ProjectView } from '@/lib/team/projects';
import Sheet from './sheet';

export default function PastSheet({
  archived,
  onClose,
  onRestored,
}: {
  archived: ProjectView[];
  onClose: () => void;
  onRestored: (message: string) => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Sheet title="Past projects" onClose={onClose}>
      <p className="lede">
        Projects arrive here when your team archives them — never automatically. Nothing is deleted;
        every survey, answer, insights and decision stays searchable. ·
        โปรเจกต์จะมาที่นี่เมื่อทีมเก็บเข้าคลังเท่านั้น ข้อมูลไม่ถูกลบ
      </p>

      {archived.length ? (
        <ul className="past">
          {archived.map((p) => (
            <li key={p.id}>
              <span>
                <span className="n">{p.clientName}</span>
                <br />
                <span className="d">
                  {p.packageLabel} · {p.answers} {p.answers === 1 ? 'answer' : 'answers'}
                  {p.archivedOn ? ` · archived ${p.archivedOn}` : ''}
                  {p.archivedByName ? ` by ${p.archivedByName}` : ''}
                </span>
              </span>
              <button
                className="o"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await restoreProject(p.id);
                    if (result.ok) onRestored(`${p.clientName} is back in the live list`);
                  })
                }
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="quiet">Nothing archived yet.</p>
      )}
    </Sheet>
  );
}
