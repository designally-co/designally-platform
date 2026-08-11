'use client';

import { useState, useTransition } from 'react';

import type { Package } from '@/lib/db/schema';
import { countQuestions, type LibraryBlock } from '@/lib/team/library-types';
import { PACKAGE_BLOCKS } from '@/lib/survey/packages';
import { createSurvey } from '@/lib/team/actions';
import { forDisplay } from '@/lib/survey/link';
import Sheet from './sheet';

const OPTIONS: { key: Package; label: string }[] = [
  { key: 'brand', label: 'Brand Strategy + Identity' },
  { key: 'design', label: 'Design' },
];

export default function NewSurveySheet({
  library,
  origin,
  onClose,
  onCreated,
}: {
  library: LibraryBlock[];
  origin: string;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [client, setClient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    const form = new FormData();
    form.set('client', client);
    form.set('package', pkg ?? '');
    start(async () => {
      const result = await createSurvey(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLink(result.link!);
      onCreated(`${OPTIONS.find((o) => o.key === pkg)?.label} questionnaire attached · สร้างแบบสอบถามแล้ว`);
    });
  };

  // the copyable link must be the one that actually resolves
  const full = link ? `${origin}${link}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet title="New survey" narrow onClose={onClose}>
      <div className="field">
        <label className="f" htmlFor="nClient">
          Client and project code
        </label>
        <input
          id="nClient"
          type="text"
          className="input"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="ACME Coffee — ACME-2026-01"
          disabled={Boolean(link)}
        />
      </div>

      <div className="field">
        <label className="f">
          Package <span>· this chooses the questionnaire</span>
        </label>
        <div className="opts">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className="opt"
              aria-pressed={pkg === o.key}
              onClick={() => setPkg(o.key)}
              disabled={Boolean(link)}
            >
              {o.label}
              <small>{countQuestions(library, PACKAGE_BLOCKS[o.key])} questions</small>
            </button>
          ))}
        </div>
      </div>

      {/* Rule 3 — collection is open-ended. There is nothing here to fill in
          about who will answer, and there never will be. */}
      <div className="field">
        <p className="note">
          <b>No need to know who will answer.</b> One link, shared as widely as the client likes.
          Answers arrive as people find time, and you close collection when there&apos;s enough. ·
          ไม่ต้องระบุจำนวนผู้ตอบ ลูกค้าส่งลิงก์ต่อได้ตามต้องการ
        </p>
      </div>

      {error && <p className="formerror">{error}</p>}

      {link ? (
        <div className="field">
          <label className="f">Send this link to the client&apos;s main contact</label>
          <div className="linkbox">
            <span>{forDisplay(full)}</span>
            <button className="btn btn-quiet btn-sm" style={{ marginLeft: 'auto' }} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="hintline">
            Opens without a login. Anyone the client forwards it to can answer.
          </p>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={submit} disabled={pending}>
          {pending ? 'Creating…' : 'Create and get link'}
        </button>
      )}
    </Sheet>
  );
}
