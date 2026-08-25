import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {/* Subtle brand glow behind the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--brand)/0.18),transparent_70%)]"
      />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-glow">
            <Dumbbell className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-2xl font-bold tracking-tight text-fg">{APP_NAME}</span>
            <span className="block text-sm text-muted">{APP_TAGLINE}</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
