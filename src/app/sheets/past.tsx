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
    <Sheet
      title="Past projects"
      /* The last one, and the only sheet the card rule would have left behind:
         it is a list of rows separated by hairlines and holds no container at
         all, so there was never any grey between cards for it to fail at. It
         takes the ground because one app is one surface — a sheet that opens
         from the same toolbar as the others cannot be the one that is a
         different colour. See `.sheet.paper`. */
      surface="paper"
      onClose={onClose}
    >
      <p className="lede">
        Projects arrive here when your team archives them — never automatically. Nothing is deleted;
        every survey, answer, insights and decision stays searchable.
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
