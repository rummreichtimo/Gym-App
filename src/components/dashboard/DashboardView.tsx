'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Apple,
  ChevronRight,
  Flame,
  Play,
  Scale,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState, Skeleton } from '@/components/ui/States';
import { formatWeight } from '@/lib/units';
import { cn, formatDuration, formatMacro, formatNumber, greeting, plural, relativeDay, toDateKey } from '@/lib/utils';
import { PR_LABELS } from '@/lib/fitness';
import type { DashboardDto } from '@/types';

export function DashboardView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<{ dashboard: DashboardDto }>('/api/dashboard'),
  });

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-40 w-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <LoadingState className="mt-4" rows={2} />
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell>
        <ErrorState onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const { dashboard } = data;
  const { profile, week, streak, nutrition, bodyWeight } = dashboard;

  return (
    <PageShell>
      <header className="mb-6 animate-fade-up">
        <p className="text-sm text-muted">{greeting()},</p>
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{profile.name}</h2>
      </header>

      <TodayCard dashboard={dashboard} />

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Zap className="h-4 w-4" />}
          label="Diese Woche"
          value={`${week.completed} / ${week.target}`}
          hint="Workouts"
          accent="brand"
        >
          <div className="mt-3 flex gap-1">
            {week.days.map((day) => (
              <div key={day.key} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={cn(
                    'h-1.5 w-full rounded-full',
                    day.done ? 'bg-brand' : day.key === toDateKey() ? 'bg-subtle' : 'bg-elevated',
                  )}
                />
                <span className="text-[10px] text-subtle">{day.label}</span>
              </div>
            ))}
          </div>
        </StatTile>

        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={
            streak.days > 0
              ? plural(streak.days, 'Tag', 'Tage')
              : plural(streak.weeks, 'Woche', 'Wochen')
          }
          hint={
            streak.days > 0
              ? 'in Folge trainiert'
              : streak.weeks > 0
                ? 'Wochenziel erreicht'
                : 'Starte deine Serie'
          }
          accent="warning"
        />

        <StatTile
          icon={<Scale className="h-4 w-4" />}
          label="Körpergewicht"
          value={
            bodyWeight.current !== null
              ? formatWeight(bodyWeight.current, profile.weightUnit)
              : '—'
          }
          hint={
            bodyWeight.current !== null && bodyWeight.previous !== null
              ? `${bodyWeight.current > bodyWeight.previous ? '+' : ''}${formatNumber(
                  Math.round((bodyWeight.current - bodyWeight.previous) * 10) / 10,
                  1,
                )} ${profile.weightUnit} seit letzter Messung`
              : bodyWeight.date
                ? relativeDay(bodyWeight.date)
                : 'Noch keine Messung'
          }
          accent="info"
          href="/progress"
        />

        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label="Verbrannt"
          value={`${formatNumber(dashboard.caloriesBurned)} kcal`}
          hint="geschätzt, diese Woche"
          accent="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <NutritionCard nutrition={nutrition} />
        <GoalsCard goals={dashboard.goals} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RecentWorkoutsCard workouts={dashboard.recentWorkouts} />
        <RecordsCard records={dashboard.recentPrs} weightUnit={profile.weightUnit} />
      </div>
    </PageShell>
  );
}

// --- Today ------------------------------------------------------------------

function TodayCard({ dashboard }: { dashboard: DashboardDto }) {
  const { today, nextWorkout, activeSession } = dashboard;

  if (activeSession) {
    return (
      <Card className="animate-fade-up border-brand/40 bg-gradient-to-br from-brand/15 to-transparent">
        <div className="p-5">
          <Badge tone="brand">Läuft gerade</Badge>
          <h3 className="mt-3 text-xl font-bold text-fg">{activeSession.name}</h3>
          <p className="mt-1 text-sm text-muted">
            Dein Workout läuft noch. Setze da fort, wo du aufgehört hast.
          </p>
          <Link href="/workout/active" className="mt-4 block">
            <Button size="lg" fullWidth>
              <Play className="h-4 w-4 fill-current" />
              Workout fortsetzen
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (today) {
    return (
      <Card className="animate-fade-up border-brand/30 bg-gradient-to-br from-brand/12 to-transparent">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge tone="brand">Heute · {today.planName}</Badge>
              <h3 className="mt-3 truncate text-2xl font-bold text-fg">{today.dayName}</h3>
              <p className="mt-1 text-sm text-muted">
                {today.exerciseCount} {today.exerciseCount === 1 ? 'Übung' : 'Übungen'} geplant
              </p>
            </div>
          </div>

          {today.lastSession ? (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-3">
              <div>
                <p className="text-xs text-subtle">Letztes Mal · Volumen</p>
                <p className="mt-0.5 font-bold text-fg">
                  {formatNumber(Math.round(today.lastSession.volume))} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-subtle">Dauer</p>
                <p className="mt-0.5 font-bold text-fg">
                  {Math.round(today.lastSession.durationSec / 60)} min
                </p>
              </div>
            </div>
          ) : null}

          <Link href={`/workout/start?dayId=${today.dayId}`} className="mt-4 block">
            <Button size="lg" fullWidth>
              <Play className="h-4 w-4 fill-current" />
              Workout starten
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up">
      <div className="p-5">
        {nextWorkout ? (
          <>
            <Badge>Kein Training für heute geplant</Badge>
            <h3 className="mt-3 text-xl font-bold text-fg">
              Nächstes Workout: {nextWorkout.dayName}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {nextWorkout.weekdayLabel} · {nextWorkout.planName}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href={`/workout/start?dayId=${nextWorkout.dayId}`} className="flex-1">
                <Button size="lg" fullWidth>
                  <Play className="h-4 w-4 fill-current" />
                  Jetzt trainieren
                </Button>
              </Link>
              <Link href="/workout" className="flex-1">
                <Button size="lg" variant="outline" fullWidth>
                  Anderes Workout
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-fg">Bereit für dein Training?</h3>
            <p className="mt-1 text-sm text-muted">
              Erstelle einen Trainingsplan oder starte direkt ein freies Workout.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/workout" className="flex-1">
                <Button size="lg" fullWidth>
                  <Play className="h-4 w-4 fill-current" />
                  Workout starten
                </Button>
              </Link>
              <Link href="/plans" className="flex-1">
                <Button size="lg" variant="outline" fullWidth>
                  Plan erstellen
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// --- Tiles ------------------------------------------------------------------

function StatTile({
  icon,
  label,
  value,
  hint,
  accent = 'brand',
  href,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'brand' | 'warning' | 'info' | 'danger';
  href?: string;
  children?: React.ReactNode;
}) {
  const accents = {
    brand: 'text-brand bg-brand/12',
    warning: 'text-warning bg-warning/12',
    info: 'text-info bg-info/12',
    danger: 'text-danger bg-danger/12',
  };

  const content = (
    <Card className="h-full p-4 transition-colors hover:border-subtle">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', accents[accent])}>
          {icon}
        </span>
        <span className="truncate text-xs font-medium text-muted">{label}</span>
      </div>
      <p className="mt-2.5 truncate text-lg font-bold text-fg sm:text-xl">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-subtle">{hint}</p> : null}
      {children}
    </Card>
  );

  return href ? (
    <Link href={href} className="tap">
      {content}
    </Link>
  ) : (
    content
  );
}

// --- Cards ------------------------------------------------------------------

function NutritionCard({ nutrition }: { nutrition: DashboardDto['nutrition'] }) {
  const { totals, targets } = nutrition;
  const remaining = Math.max(0, targets.calories - totals.calories);

  return (
    <Card>
      <CardHeader
        title="Ernährung heute"
        icon={<Apple className="h-4 w-4" />}
        action={
          <Link href="/nutrition" className="tap rounded-lg p-1.5 text-muted hover:text-fg">
            <ChevronRight className="h-5 w-5" />
          </Link>
        }
      />
      <div className="flex items-center gap-5 p-4 sm:p-5">
        <ProgressRing value={totals.calories} max={targets.calories} size={104} strokeWidth={9}>
          <span className="text-xl font-bold text-fg">{formatNumber(totals.calories)}</span>
          <span className="text-[11px] text-subtle">von {formatNumber(targets.calories)}</span>
        </ProgressRing>

        <div className="min-w-0 flex-1 space-y-3">
          <MacroRow label="Protein" value={totals.protein} target={targets.protein} color="success" />
          <MacroRow label="Kohlenhydrate" value={totals.carbs} target={targets.carbs} color="info" />
          <MacroRow label="Fett" value={totals.fat} target={targets.fat} color="warning" />
        </div>
      </div>
      <p className="border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
        {remaining > 0
          ? `Noch ${formatNumber(remaining)} kcal für heute übrig.`
          : 'Tagesziel erreicht.'}
      </p>
    </Card>
  );
}

function MacroRow({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: 'success' | 'info' | 'warning';
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-fg tabular-nums">
          {formatMacro(value)} / {formatNumber(target)} g
        </span>
      </div>
      <ProgressBar value={value} max={target} color={color} className="h-1.5" />
    </div>
  );
}

function GoalsCard({ goals }: { goals: DashboardDto['goals'] }) {
  return (
    <Card>
      <CardHeader
        title="Deine Ziele"
        icon={<Target className="h-4 w-4" />}
        action={
          <Link href="/goals" className="tap rounded-lg p-1.5 text-muted hover:text-fg">
            <ChevronRight className="h-5 w-5" />
          </Link>
        }
      />
      <div className="p-4 sm:p-5">
        {goals.length === 0 ? (
          <EmptyState
            title="Noch keine Ziele"
            description="Setze dir ein Ziel und verfolge deinen Fortschritt automatisch."
            action={
              <Link href="/goals">
                <Button size="sm">Ziel erstellen</Button>
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          <ul className="space-y-4">
            {goals.map((goal) => (
              <li key={goal.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-fg">{goal.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
                    {formatNumber(goal.currentValue, goal.currentValue % 1 === 0 ? 0 : 1)} /{' '}
                    {formatNumber(goal.targetValue, goal.targetValue % 1 === 0 ? 0 : 1)} {goal.unit}
                  </span>
                </div>
                <ProgressBar value={goal.progress * 100} max={100} className="h-1.5" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RecentWorkoutsCard({ workouts }: { workouts: DashboardDto['recentWorkouts'] }) {
  return (
    <Card>
      <CardHeader
        title="Letzte Workouts"
        icon={<Zap className="h-4 w-4" />}
        action={
          <Link href="/history" className="tap rounded-lg p-1.5 text-muted hover:text-fg">
            <ChevronRight className="h-5 w-5" />
          </Link>
        }
      />
      <div className="p-4 sm:p-5">
        {workouts.length === 0 ? (
          <EmptyState
            title="Noch keine Workouts"
            description="Starte dein erstes Workout und beginne, deinen Fortschritt zu tracken."
            action={
              <Link href="/workout">
                <Button size="sm">Workout starten</Button>
              </Link>
            }
            className="border-0 py-6"
          />
        ) : (
          <ul className="divide-y divide-border">
            {workouts.map((workout) => (
              <li key={workout.id}>
                <Link
                  href={`/history/${workout.id}`}
                  className="tap flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{workout.name}</p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {relativeDay(workout.startedAt.slice(0, 10))} ·{' '}
                      {formatDuration(workout.durationSec)} · {workout.setCount} Sätze
                    </p>
                  </div>
                  {workout.prCount > 0 ? (
                    <Badge tone="warning">
                      <Trophy className="h-3 w-3" />
                      {workout.prCount}
                    </Badge>
                  ) : null}
                  <span className="shrink-0 text-sm font-semibold text-muted tabular-nums">
                    {formatNumber(Math.round(workout.totalVolume))} kg
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RecordsCard({
  records,
  weightUnit,
}: {
  records: DashboardDto['recentPrs'];
  weightUnit: 'kg' | 'lb';
}) {
  return (
    <Card>
      <CardHeader
        title="Persönliche Rekorde"
        icon={<Trophy className="h-4 w-4" />}
        action={
          <Link href="/records" className="tap rounded-lg p-1.5 text-muted hover:text-fg">
            <ChevronRight className="h-5 w-5" />
          </Link>
        }
      />
      <div className="p-4 sm:p-5">
        {records.length === 0 ? (
          <EmptyState
            title="Noch keine Rekorde"
            description="Sobald du Sätze einträgst, erkennt IronPath deine Bestleistungen automatisch."
            className="border-0 py-6"
          />
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li key={record.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-warning">
                  <Trophy className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{record.exercise.name}</p>
                  <p className="truncate text-xs text-subtle">{PR_LABELS[record.type]}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-fg tabular-nums">
                  {record.type === 'max_reps'
                    ? `${record.reps} Wdh.`
                    : record.type === 'max_volume'
                      ? `${formatNumber(Math.round(record.value))} kg`
                      : formatWeight(record.value, weightUnit, 1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
