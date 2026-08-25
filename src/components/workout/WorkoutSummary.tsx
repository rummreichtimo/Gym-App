'use client';

import Link from 'next/link';
import { Clock, Dumbbell, Flame, Layers, PartyPopper, Trophy } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/components/session-provider';
import { formatWeight } from '@/lib/units';
import { formatDuration, formatNumber } from '@/lib/utils';

export interface SummaryData {
  id: string;
  name: string;
  durationSec: number;
  totalVolume: number;
  exerciseCount: number;
  setCount: number;
  caloriesBurned: number;
  exercises: { name: string; sets: { weightKg: number; reps: number }[] }[];
  prs: {
    exerciseName: string;
    label: string;
    type: string;
    value: number;
    weightKg: number;
    reps: number;
  }[];
}

/** Post-workout screen. The data is already saved - this is the recap. */
export function WorkoutSummary({ summary }: { summary: SummaryData }) {
  const { profile } = useSession();
  const weightUnit = profile?.weightUnit ?? 'kg';

  return (
    <PageShell width="narrow">
      <div className="mb-6 flex flex-col items-center text-center animate-fade-up">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand animate-pr-pop">
          <PartyPopper className="h-8 w-8" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-fg">Workout abgeschlossen!</h1>
        <p className="mt-1 text-sm text-muted">{summary.name} · gespeichert</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryTile
          icon={<Clock className="h-4 w-4" />}
          label="Dauer"
          value={formatDuration(summary.durationSec)}
        />
        <SummaryTile
          icon={<Dumbbell className="h-4 w-4" />}
          label="Übungen"
          value={String(summary.exerciseCount)}
        />
        <SummaryTile
          icon={<Layers className="h-4 w-4" />}
          label="Sätze"
          value={String(summary.setCount)}
        />
        <SummaryTile
          icon={<Flame className="h-4 w-4" />}
          label="Volumen"
          value={`${formatNumber(Math.round(summary.totalVolume))} kg`}
        />
      </div>

      <p className="mt-3 text-center text-xs text-subtle">
        Geschätzter Energieverbrauch: ca. {formatNumber(summary.caloriesBurned)} kcal
      </p>

      {summary.prs.length > 0 ? (
        <Card className="mt-5 border-warning/30 bg-warning/5 animate-fade-up">
          <div className="flex items-center gap-2 border-b border-warning/20 px-4 py-3">
            <Trophy className="h-5 w-5 text-warning" />
            <h2 className="font-bold text-fg">
              {summary.prs.length} {summary.prs.length === 1 ? 'neuer Rekord' : 'neue Rekorde'}
            </h2>
          </div>
          <ul className="divide-y divide-warning/15">
            {summary.prs.map((pr, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg" aria-hidden>
                  🏆
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{pr.exerciseName}</p>
                  <p className="truncate text-xs text-muted">{pr.label}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-fg tabular-nums">
                  {pr.type === 'max_reps'
                    ? `${pr.reps} Wdh.`
                    : pr.type === 'max_volume'
                      ? `${formatNumber(Math.round(pr.value))} kg`
                      : `${formatWeight(pr.weightKg, weightUnit)} × ${pr.reps}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {summary.exercises.length > 0 ? (
        <Card className="mt-4">
          <h2 className="border-b border-border px-4 py-3 font-semibold text-fg">Deine Sätze</h2>
          <ul className="divide-y divide-border">
            {summary.exercises.map((exercise, index) => (
              <li key={index} className="px-4 py-3">
                <p className="text-sm font-semibold text-fg">{exercise.name}</p>
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  {exercise.sets.map((set, setIndex) => (
                    <span key={setIndex} className="tabular-nums">
                      {formatWeight(set.weightKg, weightUnit)} × {set.reps}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/dashboard" className="flex-1">
          <Button size="lg" fullWidth>
            Zum Dashboard
          </Button>
        </Link>
        <Link href={`/history/${summary.id}`} className="flex-1">
          <Button size="lg" variant="outline" fullWidth>
            Details ansehen
          </Button>
        </Link>
      </div>
    </PageShell>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-brand">
          {icon}
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-fg tabular-nums">{value}</p>
    </Card>
  );
}
