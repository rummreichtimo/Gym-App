'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Bell, Dumbbell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { APP_NAME } from '@/lib/constants';
import { Avatar } from './Sidebar';
import { useSession } from '@/components/session-provider';
import { cn } from '@/lib/utils';

export function TopBar({
  title,
  backHref,
  action,
}: {
  title?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useSession();

  const { data } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => api.get<{ unread: number }>('/api/notifications'),
    refetchInterval: 120_000,
  });
  const unread = data?.unread ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-lg pt-safe">
      <div className="flex h-14 items-center gap-3 px-4 sm:h-16 sm:px-6">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Zurück"
            className="tap -ml-2 rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label={APP_NAME}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <Dumbbell className="h-4 w-4" />
            </span>
          </Link>
        )}

        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-fg">
          {title ?? APP_NAME}
        </h1>

        {action}

        <Link
          href="/notifications"
          aria-label={unread > 0 ? `${unread} ungelesene Benachrichtigungen` : 'Benachrichtigungen'}
          className={cn(
            'tap relative rounded-lg p-2 transition-colors hover:bg-elevated',
            pathname === '/notifications' ? 'text-brand' : 'text-muted hover:text-fg',
          )}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-fg">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Link>

        <Link href="/profile" aria-label="Profil" className="tap lg:hidden">
          <Avatar name={profile?.name ?? ''} src={profile?.avatarUrl} size="sm" />
        </Link>
      </div>
    </header>
  );
}
