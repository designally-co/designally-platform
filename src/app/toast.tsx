'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3400);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { message, show };
}

export default function Toast({ toast }: { toast: ReturnType<typeof useToast> }) {
  return (
    <div className={`toast${toast.message ? ' show' : ''}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
