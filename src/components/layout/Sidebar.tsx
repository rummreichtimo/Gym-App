'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, LogOut } from 'lucide-react';
import { DESKTOP_NAV, isActivePath } from '@/lib/navigation';
import { useSession } from '@/components/session-provider';
import { APP_NAME } from '@/lib/constants';
import { cn, initials } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
          <Dumbbell className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold tracking-tight text-fg">{APP_NAME}</span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {DESKTOP_NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand/12 text-brand'
                          : 'text-muted hover:bg-elevated hover:text-fg',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={profile?.name ?? ''} src={profile?.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{profile?.name}</p>
            <p className="truncate text-xs text-subtle">{profile?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Abmelden"
            className="tap rounded-lg p-2 text-subtle transition-colors hover:bg-elevated hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-20 w-20 text-xl',
  };

  if (src) {
    // Data URLs from the client-side downscaler; next/image cannot optimise
    // them and would only add a request.
    return (
      <img
        src={src}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', sizes[size])}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-elevated font-bold text-brand',
        sizes[size],
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}
