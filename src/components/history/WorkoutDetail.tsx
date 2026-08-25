'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Flame, Layers, Trash2, Trophy } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { estimate1RM } from '@/lib/fitness';
import { formatWeight } from '@/lib/units';
import { formatDate, formatDuration, formatNumber } from '@/lib/utils';
import { MUSCLE_GROUPS, labelFor } from '@/lib/constants';

export interface WorkoutDetailData {
  id: string;
  name: string;
  startedAt: string;
  durationSec: number;
  totalVolume: number;
  notes: string;
  exercises: {
    id: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    notes: string;
    sets: { setNumber: number; weightKg: number; reps: number; rir: number | null; isWarmup: boolean }[];
  }[];
  personalRecords: {
    id: string;
    exerciseName: string;
    label: string;
    type: string;
    value: number;
    weightKg: number;
    reps: number;
  }[];
}

export function WorkoutDetail({ workout }: { workout: WorkoutDetailData }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weightUnit = profile?.weightUnit ?? 'kg';
  const setCount = workout.exercises.reduce(
    (sum, entry) => sum + entry.sets.filter((set) => !set.isWarmup).length,
    0,
  );

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/workouts/${workout.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Workout gelöscht');
      router.replace('/history');
    },
    onError: (error) => toast.error('Workout konnte nicht gelöscht werden', errorMessage(error)),
  });

  return (
    <PageShell width="narrow">
      <p className="mb-4 text-sm text-muted">
        {formatDate(workout.startedAt.slice(0, 10), { weekday: true })}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Tile icon={<Clock className="h-4 w-4" />} label="Dauer" value={formatDuration(workout.durationSec)} />
        <Tile icon={<Layers className="h-4 w-4" />} label="Sätze" value={String(setCount)} />
        <Tile
          icon={<Flame className="h-4 w-4" />}
          label="Volumen"
          value={`${formatNumber(Math.round(workout.totalVolume))} kg`}
        />
      </div>

      {workout.personalRecords.length > 0 ? (
        <Card className="mt-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 border-b border-warning/20 px-4 py-3">
            <Trophy className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold text-fg">
              {workout.personalRecords.length}{' '}
              {workout.personalRecords.length === 1 ? 'Rekord' : 'Rekorde'} in diesem Workout
            </h2>
          </div>
          <ul className="divide-y divide-warning/15">
            {workout.personalRecords.map((record) => (
              <li key={record.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">
                    {record.exerciseName}
                  </span>
                  <span className="block truncate text-xs text-muted">{record.label}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-fg tabular-nums">
                  {record.type === 'max_reps'
                    ? `${record.reps} Wdh.`
                    : record.type === 'max_volume'
                      ? `${formatNumber(Math.round(record.value))} kg`
                      : `${formatWeight(record.weightKg, weightUnit)} × ${record.reps}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {workout.notes ? (
        <Card className="mt-4 p-4">
          <p className="text-xs font-medium text-subtle">Notiz</p>
          <p className="mt-1 text-sm text-fg">{workout.notes}</p>
        </Card>
      ) : null}

      <div className="mt-4 space-y-3">
        {workout.exercises.map((entry) => {
          const working = entry.sets.filter((set) => !set.isWarmup);
          const volume = working.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
          const best = working.reduce(
            (max, set) => Math.max(max, estimate1RM(set.weightKg, set.reps)),
            0,
          );

          return (
            <Card key={entry.id}>
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <Link href={`/exercises/${entry.exerciseId}`} className="tap min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-fg">{entry.name}</h3>
                  <p className="mt-0.5 text-xs text-subtle">
                    {labelFor(MUSCLE_GROUPS, entry.muscleGroup)} ·{' '}
                    {formatNumber(Math.round(volume))} kg Volumen
                    {best > 0 ? ` · e1RM ${formatNumber(best, 1)} kg` : ''}
                  </p>
                </Link>
              </div>

              <ul className="divide-y divide-border">
                {entry.sets.map((set) => (
                  <li key={set.setNumber} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-elevated text-xs font-bold text-muted">
                      {set.isWarmup ? 'W' : set.setNumber}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-fg tabular-nums">
                      {formatWeight(set.weightKg, weightUnit)} × {set.reps}
                    </span>
                    {set.rir !== null ? (
                      <span className="text-xs text-subtle">RIR {set.rir}</span>
                    ) : null}
                    <span className="text-xs text-subtle tabular-nums">
                      {formatNumber(Math.round(set.weightKg * set.reps))} kg
                    </span>
                  </li>
                ))}
              </ul>

              {entry.notes ? (
                <p className="border-t border-border px-4 py-2.5 text-xs text-muted">{entry.notes}</p>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Button
        variant="ghost"
        fullWidth
        className="mt-5 text-danger hover:text-danger"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="h-4 w-4" />
        Workout löschen
      </Button>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        title="Workout löschen?"
        message="Dieses Workout und alle darin gespeicherten Sätze werden dauerhaft entfernt. Zugehörige Rekorde werden ebenfalls gelöscht."
      />
    </PageShell>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <span className="text-brand">{icon}</span>
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-base font-bold text-fg tabular-nums">{value}</p>
    </Card>
  );
}
