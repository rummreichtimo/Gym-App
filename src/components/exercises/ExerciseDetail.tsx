'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, TrendingUp, Trash2, Trophy } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { TopBar } from '@/components/layout/TopBar';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/States';
import { TrendChart } from '@/components/charts/Charts';
import { CustomExerciseModal } from './ExerciseLibrary';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import { PR_LABELS, type PrType } from '@/lib/fitness';
import { formatWeight } from '@/lib/units';
import { formatDate, formatNumber } from '@/lib/utils';
import type { ExerciseDto } from '@/types';

interface DetailResponse {
  exercise: ExerciseDto;
  history: {
    sessionId: string;
    date: string;
    volume: number;
    estimated1RM: number;
    sets: { weightKg: number; reps: number }[];
  }[];
  records: {
    id: string;
    type: PrType;
    value: number;
    weightKg: number | null;
    reps: number | null;
    achievedAt: string;
  }[];
}

export function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => api.get<DetailResponse>(`/api/exercises/${exerciseId}`),
  });

  const update = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.patch(`/api/exercises/${exerciseId}`, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Übung gespeichert');
      setEditOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/exercises/${exerciseId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Übung gelöscht');
      router.replace('/exercises');
    },
    onError: (error) => toast.error('Übung konnte nicht gelöscht werden', errorMessage(error)),
  });

  if (isLoading) {
    return (
      <>
        <TopBar title="Übung" backHref="/exercises" />
        <PageShell>
          <LoadingState rows={4} />
        </PageShell>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <TopBar title="Übung" backHref="/exercises" />
        <PageShell>
          <ErrorState message="Diese Übung konnte nicht geladen werden." onRetry={() => void refetch()} />
        </PageShell>
      </>
    );
  }

  const { exercise, history, records } = data;
  const weightUnit = profile?.weightUnit ?? 'kg';
  const chartData = history.map((entry) => ({
    label: formatDate(entry.date.slice(0, 10), { withYear: false }),
    value: entry.estimated1RM,
  }));

  return (
    <>
      <TopBar
        title={exercise.name}
        backHref="/exercises"
        action={
          exercise.isCustom ? (
            <div className="flex">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label="Übung bearbeiten"
                className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Übung löschen"
                className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : undefined
        }
      />

      <PageShell width="narrow">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="brand">{labelFor(MUSCLE_GROUPS, exercise.muscleGroup)}</Badge>
          <Badge>{labelFor(EQUIPMENT, exercise.equipment)}</Badge>
          <Badge>{labelFor(DIFFICULTIES, exercise.difficulty)}</Badge>
          {exercise.isCustom ? <Badge tone="info">Eigene Übung</Badge> : null}
        </div>

        {exercise.secondaryMuscles.length > 0 ? (
          <p className="mb-4 text-sm text-muted">
            Sekundär beansprucht:{' '}
            {exercise.secondaryMuscles.map((key) => labelFor(MUSCLE_GROUPS, key)).join(', ')}
          </p>
        ) : null}

        {exercise.description ? (
          <Card className="mb-4 p-4">
            <p className="text-sm text-fg">{exercise.description}</p>
          </Card>
        ) : null}

        {exercise.instructions.length > 0 ? (
          <Card className="mb-4">
            <CardHeader title="Ausführung" />
            <ol className="space-y-2.5 p-4 sm:p-5">
              {exercise.instructions.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-elevated text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  <span className="text-sm text-fg">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}

        {records.length > 0 ? (
          <Card className="mb-4">
            <CardHeader title="Deine Rekorde" icon={<Trophy className="h-4 w-4" />} />
            <ul className="divide-y divide-border">
              {records.map((record) => (
                <li key={record.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{PR_LABELS[record.type]}</p>
                    <p className="text-xs text-subtle">
                      {formatDate(record.achievedAt.slice(0, 10))}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-fg tabular-nums">
                    {record.type === 'max_reps'
                      ? `${record.reps} Wdh.`
                      : record.type === 'max_volume'
                        ? `${formatNumber(Math.round(record.value))} kg`
                        : formatWeight(record.value, weightUnit)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Kraftentwicklung"
            subtitle="Geschätztes 1RM pro Training"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <div className="p-4 sm:p-5">
            {chartData.length < 2 ? (
              <EmptyState
                title="Noch nicht genug Daten"
                description="Trainiere diese Übung mindestens zweimal, um deinen Verlauf zu sehen."
                className="border-0 py-6"
              />
            ) : (
              <TrendChart data={chartData} unit="kg" decimals={1} />
            )}
          </div>
        </Card>

        {history.length > 0 ? (
          <Card className="mt-4">
            <CardHeader title="Verlauf" subtitle={`${history.length} Trainingseinheiten`} />
            <ul className="divide-y divide-border">
              {[...history].reverse().slice(0, 15).map((entry) => (
                <li key={entry.sessionId} className="px-4 py-3 sm:px-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-fg">
                      {formatDate(entry.date.slice(0, 10))}
                    </span>
                    <span className="text-xs text-subtle tabular-nums">
                      {formatNumber(Math.round(entry.volume))} kg Volumen
                    </span>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    {entry.sets.map((set, index) => (
                      <span key={index} className="tabular-nums">
                        {formatWeight(set.weightKg, weightUnit)} × {set.reps}
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </PageShell>

      {editOpen ? (
        <CustomExerciseModal
          open
          title="Übung bearbeiten"
          initial={exercise}
          onClose={() => setEditOpen(false)}
          onSubmit={(values) => update.mutate(values)}
          loading={update.isPending}
          error={update.error}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        title="Übung löschen?"
        message={`„${exercise.name}“ wird dauerhaft gelöscht und aus allen Trainingsplänen entfernt.`}
      />
    </>
  );
}
