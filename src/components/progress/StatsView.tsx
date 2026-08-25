'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3, Clock, Dumbbell, Flame, Layers, Trophy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { BarSeriesChart, RankedBars } from '@/components/charts/Charts';
import { useSession } from '@/components/session-provider';
import { formatWeight } from '@/lib/units';
import { formatNumber } from '@/lib/utils';
import type { StatsDto } from '@/types';

type Range = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

export function StatsView() {
  const { profile } = useSession();
  const [range, setRange] = useState<Range>('3m');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats', range],
    queryFn: () => api.get<{ stats: StatsDto }>(`/api/stats?range=${range}`),
  });

  const stats = data?.stats;
  const weightUnit = profile?.weightUnit ?? 'kg';

  return (
    <PageShell>
      <Tabs
        className="mb-4"
        size="sm"
        value={range}
        onChange={setRange}
        options={[
          { value: '7d', label: '7 Tage' },
          { value: '30d', label: '30 Tage' },
          { value: '3m', label: '3 Monate' },
          { value: '6m', label: '6 Monate' },
          { value: '1y', label: '1 Jahr' },
          { value: 'all', label: 'Alles' },
        ]}
      />

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError || !stats ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : stats.totals.workouts === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Noch keine Daten in diesem Zeitraum"
          description="Absolviere Workouts, um deine Statistiken zu füllen. Wähle einen längeren Zeitraum, falls du früher trainiert hast."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Tile
              icon={<Dumbbell className="h-4 w-4" />}
              label="Workouts"
              value={formatNumber(stats.totals.workouts)}
            />
            <Tile
              icon={<Clock className="h-4 w-4" />}
              label="Trainingszeit"
              value={`${formatNumber(Math.round(stats.totals.durationSec / 3600))} h`}
            />
            <Tile
              icon={<Flame className="h-4 w-4" />}
              label="Gesamtvolumen"
              value={`${formatNumber(stats.totals.volume)} kg`}
            />
            <Tile
              icon={<Layers className="h-4 w-4" />}
              label="Sätze"
              value={formatNumber(stats.totals.sets)}
            />
            <Tile
              icon={<Activity className="h-4 w-4" />}
              label="Ø Dauer"
              value={`${Math.round(stats.totals.avgDurationSec / 60)} min`}
            />
            <Tile
              icon={<Trophy className="h-4 w-4" />}
              label="Rekorde"
              value={formatNumber(stats.totals.prs)}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Workout-Frequenz"
                subtitle={stats.frequency.length > 12 ? 'pro Monat' : 'pro Woche'}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <div className="p-4 sm:p-5">
                <BarSeriesChart data={stats.frequency.map((entry) => ({ label: entry.label, value: entry.workouts }))} unit="Workouts" highlightMax />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Volumen pro Muskelgruppe"
                subtitle="Wo dein Trainingsvolumen landet"
                icon={<Flame className="h-4 w-4" />}
              />
              <div className="p-4 sm:p-5">
                {stats.muscleVolume.length === 0 ? (
                  <EmptyState title="Noch keine Daten" className="border-0 py-6" />
                ) : (
                  <RankedBars data={stats.muscleVolume.map((entry) => ({ label: entry.label, value: entry.volume }))} />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Häufigste Übungen"
                subtitle="Nach Anzahl der Trainingseinheiten"
                icon={<Dumbbell className="h-4 w-4" />}
              />
              <ul className="divide-y divide-border">
                {stats.topExercises.map((exercise, index) => (
                  <li key={exercise.name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated text-xs font-bold text-brand">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                      {exercise.name}
                    </span>
                    <span className="shrink-0 text-xs text-subtle tabular-nums">
                      {exercise.sessions}× · {formatNumber(exercise.volume)} kg
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Durchschnittswerte" subtitle="Über den gewählten Zeitraum" />
              <dl className="divide-y divide-border">
                <Row
                  label="Körpergewicht"
                  value={
                    stats.averages.bodyWeight !== null
                      ? formatWeight(stats.averages.bodyWeight, weightUnit)
                      : 'Keine Messungen'
                  }
                />
                <Row
                  label="Kalorien pro Tag"
                  value={
                    stats.averages.calories !== null
                      ? `${formatNumber(stats.averages.calories)} kcal`
                      : 'Keine Einträge'
                  }
                />
                <Row
                  label="Protein pro Tag"
                  value={
                    stats.averages.protein !== null
                      ? `${formatNumber(stats.averages.protein)} g`
                      : 'Keine Einträge'
                  }
                />
                <Row
                  label="Sätze pro Workout"
                  value={
                    stats.totals.workouts > 0
                      ? formatNumber(stats.totals.sets / stats.totals.workouts, 1)
                      : '—'
                  }
                />
                <Row
                  label="Volumen pro Workout"
                  value={
                    stats.totals.workouts > 0
                      ? `${formatNumber(Math.round(stats.totals.volume / stats.totals.workouts))} kg`
                      : '—'
                  }
                />
              </dl>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-brand">
          {icon}
        </span>
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 truncate text-xl font-bold text-fg tabular-nums">{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-fg tabular-nums">{value}</dd>
    </div>
  );
}
