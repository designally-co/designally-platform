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
      {/**
       * The paragraph that stood here went on 20 August 2026, asked for.
       *
       * It explained that projects arrive by hand and that nothing is deleted —
       * three facts a reader can see for themselves the moment there is a list,
       * and which they are told again by the archive confirmation on the way in.
       * It was also going stale: it promised that "every survey, answer,
       * insights and decision stays searchable", and decisions were retired with
       * the kick-off on 17 August.
       *
       * A sheet whose first line explains the sheet is a sheet that does not
       * trust its own title.
       */}
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
        /* Centred in the sheet, now that it is the only thing in it. Set as a
           line rather than a card: there is nothing here to draw a container
           around, which is the same reasoning the projects sheet's own empty
           state follows. */
        <p className="pastnone">Nothing archived yet.</p>
      )}
    </Sheet>
  );
}
