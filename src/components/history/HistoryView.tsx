'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronRight, Clock, Layers, Trophy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { WorkoutCalendar } from './WorkoutCalendar';
import { formatDate, formatDuration, formatNumber, monthName } from '@/lib/utils';
import type { WorkoutSummaryDto } from '@/types';

export function HistoryView() {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['workouts', 'history'],
      initialPageParam: null as string | null,
      queryFn: ({ pageParam }) =>
        api.get<{ workouts: WorkoutSummaryDto[]; nextCursor: string | null }>(
          `/api/workouts?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`,
        ),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const workouts = data?.pages.flatMap((page) => page.workouts) ?? [];

  // Group workouts by month for readable section headers.
  const grouped = workouts.reduce<{ key: string; label: string; items: WorkoutSummaryDto[] }[]>(
    (groups, workout) => {
      const date = new Date(workout.startedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.items.push(workout);
      } else {
        groups.push({
          key,
          label: `${monthName(date.getMonth())} ${date.getFullYear()}`,
          items: [workout],
        });
      }
      return groups;
    },
    [],
  );

  return (
    <PageShell>
      <Tabs
        className="mb-4"
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: 'Liste' },
          { value: 'calendar', label: 'Kalender' },
        ]}
      />

      {view === 'calendar' ? (
        <WorkoutCalendar />
      ) : isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Noch keine Workouts"
          description="Starte dein erstes Workout und beginne, deinen Fortschritt zu tracken."
          action={
            <Link href="/workout">
              <Button>Workout starten</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-5">
            {grouped.map((group) => (
              <section key={group.key}>
                <h3 className="mb-2 text-sm font-semibold text-muted">{group.label}</h3>
                <ul className="space-y-2">
                  {group.items.map((workout) => (
                    <li key={workout.id}>
                      <Link href={`/history/${workout.id}`} className="tap block">
                        <Card className="p-4 transition-colors hover:border-subtle">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate font-semibold text-fg">{workout.name}</h4>
                                {workout.prCount > 0 ? (
                                  <Badge tone="warning">
                                    <Trophy className="h-3 w-3" />
                                    {workout.prCount}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-xs text-subtle">
                                {formatDate(workout.startedAt.slice(0, 10), { weekday: true })}
                              </p>
                            </div>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(workout.durationSec)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" />
                              {workout.setCount} Sätze · {workout.exerciseCount} Übungen
                            </span>
                            <span className="ml-auto font-semibold text-fg tabular-nums">
                              {formatNumber(Math.round(workout.totalVolume))} kg
                            </span>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {hasNextPage ? (
            <Button
              variant="outline"
              fullWidth
              className="mt-5"
              onClick={() => void fetchNextPage()}
              loading={isFetchingNextPage}
            >
              Mehr laden
            </Button>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
