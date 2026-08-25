import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-brand">
          <Compass className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-fg">Seite nicht gefunden</h1>
        <p className="mt-1.5 text-sm text-muted">
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/dashboard"
          className="tap mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-semibold text-brand-fg transition-colors hover:bg-brand/90"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
