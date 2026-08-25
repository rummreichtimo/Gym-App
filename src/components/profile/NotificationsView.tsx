'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Calendar, CheckCheck, Flame, Medal, Target, Trash2, Trophy } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { NotificationDto } from '@/types';

const ICONS: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-4 w-4" />,
  flame: <Flame className="h-4 w-4" />,
  medal: <Medal className="h-4 w-4" />,
  target: <Target className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
};

const TONES: Record<string, string> = {
  pr: 'bg-warning/12 text-warning',
  streak: 'bg-brand/12 text-brand',
  goal: 'bg-success/12 text-success',
  reminder: 'bg-info/12 text-info',
  rest: 'bg-elevated text-muted',
};

export function NotificationsView() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api.get<{ notifications: NotificationDto[]; unread: number }>('/api/notifications'),
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAll = useMutation({
    mutationFn: () => api.delete('/api/notifications'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Posteingang geleert');
    },
    onError: (error) => toast.error('Löschen fehlgeschlagen', errorMessage(error)),
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  // Opening the inbox marks everything as read.
  useEffect(() => {
    if (unread > 0 && !markAll.isPending) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  if (isLoading) {
    return (
      <PageShell width="narrow">
        <LoadingState rows={4} />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell width="narrow">
        <ErrorState onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="Keine Benachrichtigungen"
          description="Hier erscheinen deine Rekorde, Streaks, erreichten Ziele und Erinnerungen."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {notifications.length}{' '}
              {notifications.length === 1 ? 'Benachrichtigung' : 'Benachrichtigungen'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAll.mutate()}
              loading={clearAll.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Alle löschen
            </Button>
          </div>

          <ul className="space-y-2">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Card
                  className={cn(
                    'flex items-start gap-3 p-4',
                    !notification.readAt && 'border-brand/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      TONES[notification.type] ?? 'bg-elevated text-muted',
                    )}
                  >
                    {ICONS[notification.icon] ?? <Bell className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{notification.title}</p>
                    {notification.body ? (
                      <p className="mt-0.5 text-sm text-muted">{notification.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-subtle">
                      {formatDate(notification.createdAt.slice(0, 10), { withYear: false })} ·{' '}
                      {formatTime(notification.createdAt)} Uhr
                    </p>
                  </div>
                  {!notification.readAt ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Ungelesen" />
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-subtle">
            <CheckCheck className="h-3.5 w-3.5" />
            Alle Benachrichtigungen wurden als gelesen markiert.
          </p>
        </>
      )}
    </PageShell>
  );
}
