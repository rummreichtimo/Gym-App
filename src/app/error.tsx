'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Catches render errors so a bad page never leaves the user on a blank screen. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ironpath]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/12 text-danger">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-fg">Etwas ist schiefgelaufen</h1>
        <p className="mt-1.5 text-sm text-muted">
          Diese Seite konnte nicht geladen werden. Deine gespeicherten Daten sind davon nicht
          betroffen.
        </p>
        <button
          type="button"
          onClick={reset}
          className="tap mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-fg transition-colors hover:bg-brand/90"
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
