'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Dumbbell, Plus, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './RestTimer';
import { useRestTimer } from '@/hooks/useRestTimer';
import { playRestFinishedSound, vibrate } from '@/lib/sound';
import { formatDuration, formatNumber } from '@/lib/utils';
import type { ExerciseDto, WorkoutSessionDto } from '@/types';

interface FinishSummary {
  id: string;
  name: string;
  durationSec: number;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  caloriesBurned: number;
  prs: {
    exerciseName: string;
    label: string;
    value: number;
    weightKg: number;
    reps: number;
    previousValue: number | null;
    type: string;
  }[];
}

export function ActiveWorkout() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSession();

  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [savingSetId, setSavingSetId] = useState<string | null>(null);
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);

  const soundEnabled = profile?.soundEnabled ?? true;
  const onRestComplete = useCallback(() => {
    if (soundEnabled) playRestFinishedSound();
    vibrate();
  }, [soundEnabled]);

  // Timer lives here, above the exercise list, so switching exercises never
  // interrupts a running countdown.
  const timer = useRestTimer(onRestComplete);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workout', 'active'],
    queryFn: () => api.get<{ session: WorkoutSessionDto | null }>('/api/workouts/active'),
  });

  const session = data?.session ?? null;

  // Live workout duration.
  useEffect(() => {
    if (!session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.startedAt, session]);

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['workout', 'active'] });
  }, [queryClient]);

  // --- Mutations ------------------------------------------------------------

  const addSet = useMutation({
    mutationFn: ({ sessionExerciseId, isWarmup }: { sessionExerciseId: string; isWarmup: boolean }) =>
      api.post(`/api/workouts/${session?.id}/exercises/${sessionExerciseId}/sets`, {
        weightKg: 0,
        reps: 0,
        isWarmup,
        completed: false,
      }),
    onSuccess: refreshSession,
    onError: (error) => toast.error('Satz konnte nicht angelegt werden', errorMessage(error)),
  });

  const saveSet = useMutation({
    mutationFn: ({
      sessionExerciseId,
      setId,
      values,
    }: {
      sessionExerciseId: string;
      setId: string;
      values: { weightKg: number; reps: number; rir: number | null; completed: boolean };
      restSec: number;
      wasCompleted: boolean;
    }) => api.patch(`/api/workouts/${session?.id}/exercises/${sessionExerciseId}/sets/${setId}`, values),
    onMutate: (variables) => setSavingSetId(variables.setId),
    onSuccess: async (_result, variables) => {
      await refreshSession();
      // Starting the rest timer on completion is the whole point of the flow.
      if (!variables.wasCompleted && variables.values.completed && variables.restSec > 0) {
        timer.start(variables.restSec);
      }
    },
    onError: (error) => toast.error('Satz konnte nicht gespeichert werden', errorMessage(error)),
    onSettled: () => setSavingSetId(null),
  });

  const deleteSet = useMutation({
    mutationFn: ({ sessionExerciseId, setId }: { sessionExerciseId: string; setId: string }) =>
      api.delete(`/api/workouts/${session?.id}/exercises/${sessionExerciseId}/sets/${setId}`),
    onSuccess: refreshSession,
    onError: (error) => toast.error('Satz konnte nicht gelöscht werden', errorMessage(error)),
  });

  const addExercise = useMutation({
    mutationFn: (exerciseId: string) =>
      api.post(`/api/workouts/${session?.id}/exercises`, { exerciseId }),
    onMutate: (exerciseId) => setAddingExerciseId(exerciseId),
    onSuccess: refreshSession,
    onError: (error) => toast.error('Übung konnte nicht hinzugefügt werden', errorMessage(error)),
    onSettled: () => setAddingExerciseId(null),
  });

  const removeExercise = useMutation({
    mutationFn: (sessionExerciseId: string) =>
      api.delete(`/api/workouts/${session?.id}/exercises/${sessionExerciseId}`),
    onSuccess: refreshSession,
    onError: (error) => toast.error('Übung konnte nicht entfernt werden', errorMessage(error)),
  });

  const finish = useMutation({
    mutationFn: () =>
      api.post<{ summary: FinishSummary }>(`/api/workouts/${session?.id}/finish`, {
        durationSec: elapsed,
      }),
    onSuccess: async (result) => {
      timer.stop();
      await queryClient.invalidateQueries();
      router.replace(`/workout/${result.summary.id}/summary`);
    },
    onError: (error) => toast.error('Workout konnte nicht abgeschlossen werden', errorMessage(error)),
  });

  const discard = useMutation({
    mutationFn: () => api.delete(`/api/workouts/${session?.id}`),
    onSuccess: async () => {
      timer.stop();
      await queryClient.invalidateQueries();
      toast.info('Workout verworfen');
      router.replace('/dashboard');
    },
    onError: (error) => toast.error('Workout konnte nicht verworfen werden', errorMessage(error)),
  });

  // --- Derived --------------------------------------------------------------

  const stats = useMemo(() => {
    if (!session) return { sets: 0, volume: 0 };
    let sets = 0;
    let volume = 0;
    for (const entry of session.exercises) {
      for (const set of entry.sets) {
        if (set.completed && !set.isWarmup) {
          sets += 1;
          volume += set.weightKg * set.reps;
        }
      }
    }
    return { sets, volume };
  }, [session]);

  // --- Render ---------------------------------------------------------------

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

  if (!session) {
    return (
      <PageShell width="narrow">
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Kein laufendes Workout"
          description="Starte ein Workout, um Sätze, Gewichte und Wiederholungen zu tracken."
          action={
            <Link href="/workout">
              <Button size="lg">Workout starten</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  const hasCompletedSets = stats.sets > 0;

  return (
    <>
      {/* Workout header with live duration and volume */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-lg pt-safe">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            aria-label="Workout verwerfen"
            className="tap -ml-2 rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-danger"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-fg">{session.name}</h1>
            <p className="text-xs text-subtle tabular-nums">
              {formatDuration(elapsed)} · {stats.sets} Sätze ·{' '}
              {formatNumber(Math.round(stats.volume))} kg
            </p>
          </div>
          <Button size="sm" onClick={() => setConfirmFinish(true)} disabled={finish.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            Beenden
          </Button>
        </div>
      </header>

      <PageShell width="narrow" className="pb-40">
        {session.exercises.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="h-6 w-6" />}
            title="Noch keine Übungen"
            description="Füge deine erste Übung hinzu, um mit dem Tracking zu starten."
            action={
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                Übung hinzufügen
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {session.exercises.map((entry) => (
              <ExerciseCard
                key={entry.id}
                entry={entry}
                weightUnit={profile?.weightUnit ?? 'kg'}
                savingSetId={savingSetId}
                addingSet={addSet.isPending}
                onAddSet={(isWarmup) =>
                  addSet.mutate({ sessionExerciseId: entry.id, isWarmup })
                }
                onSaveSet={(setId, values) => {
                  const set = entry.sets.find((item) => item.id === setId);
                  saveSet.mutate({
                    sessionExerciseId: entry.id,
                    setId,
                    values,
                    restSec: set?.isWarmup ? 0 : entry.restSec,
                    wasCompleted: set?.completed ?? false,
                  });
                }}
                onDeleteSet={(setId) => deleteSet.mutate({ sessionExerciseId: entry.id, setId })}
                onRemoveExercise={() => removeExercise.mutate(entry.id)}
                onStartRest={(seconds) => timer.start(seconds)}
              />
            ))}
          </div>
        )}

        {session.exercises.length > 0 ? (
          <Button
            variant="outline"
            size="lg"
            fullWidth
            className="mt-3"
            onClick={() => setPickerOpen(true)}
            loading={addingExerciseId !== null}
          >
            <Plus className="h-4 w-4" />
            Übung hinzufügen
          </Button>
        ) : null}

        <Card className="mt-4 p-4">
          <p className="text-xs text-subtle">
            Jeder Satz wird sofort gespeichert. Du kannst die App zwischendurch verlassen – dein
            Workout läuft weiter.
          </p>
        </Card>
      </PageShell>

      <RestTimer timer={timer} />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        excludeIds={session.exercises.map((entry) => entry.exercise.id)}
        onSelect={(exercises: ExerciseDto[]) => {
          exercises.forEach((exercise) => addExercise.mutate(exercise.id));
        }}
      />

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={() => finish.mutate()}
        loading={finish.isPending}
        title="Workout abschließen?"
        message={
          hasCompletedSets
            ? `Du hast ${stats.sets} Sätze mit ${formatNumber(Math.round(stats.volume))} kg Volumen absolviert. Leere Sätze werden dabei entfernt.`
            : 'Du hast noch keinen Satz abgeschlossen. Möchtest du das Workout trotzdem speichern?'
        }
        confirmLabel="Abschließen"
      />

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => discard.mutate()}
        loading={discard.isPending}
        title="Workout verwerfen?"
        message="Alle Sätze dieses Workouts werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
        confirmLabel="Verwerfen"
      />
    </>
  );
}
