'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ListChecks, Play, Plus, Zap } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { useToast } from '@/components/ui/Toast';
import { weekdayName } from '@/lib/utils';
import type { ExerciseDto, PlanDto, WorkoutSessionDto } from '@/types';

/** Entry point for starting a workout: from the active plan or freestyle. */
export function WorkoutHub() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: active } = useQuery({
    queryKey: ['workout', 'active'],
    queryFn: () => api.get<{ session: WorkoutSessionDto | null }>('/api/workouts/active'),
  });

  const { data: plansData, isLoading, isError, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () =>
      api.get<{ plans: { id: string; name: string; isActive: boolean }[]; activePlanId: string | null }>(
        '/api/plans',
      ),
  });

  const activePlanId = plansData?.activePlanId ?? null;

  const { data: planDetail } = useQuery({
    queryKey: ['plan', activePlanId],
    queryFn: () => api.get<{ plan: PlanDto }>(`/api/plans/${activePlanId}`),
    enabled: Boolean(activePlanId),
  });

  const startWorkout = useMutation({
    mutationFn: (payload: { dayId?: string; exerciseIds?: string[]; name?: string }) =>
      api.post<{ session: WorkoutSessionDto }>('/api/workouts', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workout', 'active'] });
      router.push('/workout/active');
    },
    onError: (error) => toast.error('Workout konnte nicht gestartet werden', errorMessage(error)),
  });

  if (active?.session) {
    return (
      <PageShell width="narrow">
        <Card className="border-brand/40 bg-gradient-to-br from-brand/15 to-transparent p-5">
          <Badge tone="brand">Läuft gerade</Badge>
          <h2 className="mt-3 text-xl font-bold text-fg">{active.session.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Du kannst immer nur ein Workout gleichzeitig durchführen. Setze es fort oder beende es.
          </p>
          <Link href="/workout/active" className="mt-4 block">
            <Button size="lg" fullWidth>
              <Play className="h-4 w-4 fill-current" />
              Workout fortsetzen
            </Button>
          </Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow">
      <PageHeader
        title="Womit trainierst du heute?"
        description="Wähle einen Tag aus deinem Plan oder stelle dir dein Workout selbst zusammen."
      />

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-4">
          {planDetail?.plan && planDetail.plan.days.length > 0 ? (
            <section>
              <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-muted">
                <ListChecks className="h-4 w-4" />
                {planDetail.plan.name}
              </h3>
              <ul className="space-y-2">
                {planDetail.plan.days.map((day) => (
                  <li key={day.id}>
                    <Card className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-fg">{day.name}</p>
                        <p className="mt-0.5 text-xs text-subtle">
                          {day.exercises.length}{' '}
                          {day.exercises.length === 1 ? 'Übung' : 'Übungen'}
                          {day.weekday !== null ? ` · ${weekdayName(day.weekday)}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startWorkout.mutate({ dayId: day.id })}
                        loading={startWorkout.isPending && startWorkout.variables?.dayId === day.id}
                        disabled={day.exercises.length === 0}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Starten
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="Noch kein aktiver Trainingsplan"
              description="Erstelle einen Plan, um deine Trainingstage mit einem Tipp zu starten."
              action={
                <Link href="/plans">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Plan erstellen
                  </Button>
                </Link>
              }
            />
          )}

          <section className="space-y-2">
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-muted">
              <Zap className="h-4 w-4" />
              Ohne Plan
            </h3>
            <Card className="p-4">
              <p className="font-semibold text-fg">Freies Workout</p>
              <p className="mt-0.5 text-sm text-muted">
                Starte leer und füge deine Übungen während des Trainings hinzu.
              </p>
              <Button
                className="mt-3"
                variant="outline"
                fullWidth
                onClick={() => startWorkout.mutate({ name: 'Freies Workout' })}
                loading={startWorkout.isPending && !startWorkout.variables?.dayId}
              >
                <Play className="h-4 w-4" />
                Leeres Workout starten
              </Button>
            </Card>
            <Card className="p-4">
              <p className="font-semibold text-fg">Übungen auswählen</p>
              <p className="mt-0.5 text-sm text-muted">
                Stelle dir dein Workout aus der Übungsdatenbank zusammen.
              </p>
              <Button className="mt-3" variant="outline" fullWidth onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" />
                Übungen wählen
              </Button>
            </Card>
          </section>

          <Link href="/history" className="tap block">
            <Card className="flex items-center gap-3 p-4 transition-colors hover:border-subtle">
              <CalendarDays className="h-5 w-5 shrink-0 text-muted" />
              <span className="flex-1 text-sm font-medium text-fg">Trainingshistorie ansehen</span>
            </Card>
          </Link>
        </div>
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        title="Workout zusammenstellen"
        onSelect={(exercises: ExerciseDto[]) => {
          if (exercises.length === 0) return;
          startWorkout.mutate({
            exerciseIds: exercises.map((exercise) => exercise.id),
            name: 'Freies Workout',
          });
        }}
      />
    </PageShell>
  );
}
