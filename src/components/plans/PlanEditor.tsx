'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { TopBar } from '@/components/layout/TopBar';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { PlanExerciseEditor } from './PlanExerciseEditor';
import { weekdayName } from '@/lib/utils';
import type { ExerciseDto, PlanDayDto, PlanDto, PlanExerciseDto } from '@/types';

export function PlanEditor({ planId }: { planId: string }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<{ mode: 'create' | 'edit'; day?: PlanDayDto } | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [editExercise, setEditExercise] = useState<{ dayId: string; item: PlanExerciseDto } | null>(null);
  const [deleteDay, setDeleteDay] = useState<PlanDayDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api.get<{ plan: PlanDto }>(`/api/plans/${planId}`),
  });

  const plan = data?.plan;
  const days = plan?.days ?? [];
  const currentDay = days.find((day) => day.id === activeDayId) ?? days[0] ?? null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['plan', planId] });
    await queryClient.invalidateQueries({ queryKey: ['plans'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // --- Mutations ------------------------------------------------------------

  const savePlan = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      api.patch(`/api/plans/${planId}`, values),
    onSuccess: async () => {
      await invalidate();
      toast.success('Plan gespeichert');
      setPlanModal(false);
      setFieldErrors({});
    },
    onError: handleFormError,
  });

  const saveDay = useMutation({
    mutationFn: ({
      dayId,
      values,
    }: {
      dayId?: string;
      values: { name: string; notes: string; weekday: number | null };
    }) =>
      dayId
        ? api.patch(`/api/plans/${planId}/days/${dayId}`, values)
        : api.post(`/api/plans/${planId}/days`, values),
    onSuccess: async () => {
      await invalidate();
      toast.success('Trainingstag gespeichert');
      setDayModal(null);
      setFieldErrors({});
    },
    onError: handleFormError,
  });

  const removeDay = useMutation({
    mutationFn: (dayId: string) => api.delete(`/api/plans/${planId}/days/${dayId}`),
    onSuccess: async () => {
      await invalidate();
      toast.success('Trainingstag gelöscht');
      setDeleteDay(null);
      setActiveDayId(null);
    },
    onError: (error) => toast.error('Tag konnte nicht gelöscht werden', errorMessage(error)),
  });

  const addExercise = useMutation({
    mutationFn: ({ dayId, exerciseId }: { dayId: string; exerciseId: string }) =>
      api.post(`/api/plans/${planId}/days/${dayId}/exercises`, { exerciseId }),
    onSuccess: invalidate,
    onError: (error) => toast.error('Übung konnte nicht hinzugefügt werden', errorMessage(error)),
  });

  const removeExercise = useMutation({
    mutationFn: ({ dayId, planExerciseId }: { dayId: string; planExerciseId: string }) =>
      api.delete(`/api/plans/${planId}/days/${dayId}/exercises/${planExerciseId}`),
    onSuccess: invalidate,
    onError: (error) => toast.error('Übung konnte nicht entfernt werden', errorMessage(error)),
  });

  const reorderExercises = useMutation({
    mutationFn: ({ dayId, ids }: { dayId: string; ids: string[] }) =>
      api.post(`/api/plans/${planId}/days/${dayId}/exercises/reorder`, { ids }),
    onSuccess: invalidate,
    onError: (error) => toast.error('Reihenfolge konnte nicht gespeichert werden', errorMessage(error)),
  });

  function handleFormError(error: unknown) {
    if (error instanceof ApiClientError && error.details) {
      setFieldErrors(error.details);
      return;
    }
    toast.error('Speichern fehlgeschlagen', errorMessage(error));
  }

  /** Moves an exercise one position up or down within its day. */
  function move(day: PlanDayDto, index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= day.exercises.length) return;
    const ids = day.exercises.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderExercises.mutate({ dayId: day.id, ids });
  }

  if (isLoading) {
    return (
      <>
        <TopBar title="Trainingsplan" backHref="/plans" />
        <PageShell>
          <LoadingState rows={4} />
        </PageShell>
      </>
    );
  }

  if (isError || !plan) {
    return (
      <>
        <TopBar title="Trainingsplan" backHref="/plans" />
        <PageShell>
          <ErrorState message="Dieser Trainingsplan konnte nicht geladen werden." onRetry={() => void refetch()} />
        </PageShell>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={plan.name}
        backHref="/plans"
        action={
          <button
            type="button"
            onClick={() => setPlanModal(true)}
            aria-label="Plan umbenennen"
            className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      <PageShell>
        {plan.description ? <p className="mb-4 text-sm text-muted">{plan.description}</p> : null}

        {days.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Noch keine Trainingstage"
            description="Füge Tage wie „Push“, „Pull“ oder „Beine“ hinzu und fülle sie mit Übungen."
            action={
              <Button onClick={() => setDayModal({ mode: 'create' })}>
                <Plus className="h-4 w-4" />
                Trainingstag hinzufügen
              </Button>
            }
          />
        ) : (
          <>
            {/* Day switcher */}
            <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDayId(day.id)}
                  className={`tap flex shrink-0 flex-col items-start gap-0.5 rounded-xl border px-4 py-2.5 transition-all ${
                    currentDay?.id === day.id
                      ? 'border-brand bg-brand/10'
                      : 'border-border bg-surface hover:border-subtle'
                  }`}
                >
                  <span className="text-sm font-semibold text-fg">{day.name}</span>
                  <span className="text-xs text-subtle">
                    {day.exercises.length} {day.exercises.length === 1 ? 'Übung' : 'Übungen'}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDayModal({ mode: 'create' })}
                className="tap flex h-full shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
              >
                <Plus className="h-4 w-4" />
                Tag
              </button>
            </div>

            {currentDay ? (
              <Card>
                <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-fg">{currentDay.name}</h2>
                    {currentDay.weekday !== null ? (
                      <Badge className="mt-1.5">{weekdayName(currentDay.weekday)}</Badge>
                    ) : (
                      <Badge className="mt-1.5">Flexibel</Badge>
                    )}
                    {currentDay.notes ? (
                      <p className="mt-2 text-sm text-muted">{currentDay.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setDayModal({ mode: 'edit', day: currentDay })}
                      aria-label="Trainingstag bearbeiten"
                      className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDay(currentDay)}
                      aria-label="Trainingstag löschen"
                      className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {currentDay.exercises.length === 0 ? (
                    <EmptyState
                      icon={<ListChecks className="h-6 w-6" />}
                      title="Noch keine Übungen"
                      description="Füge Übungen hinzu und lege Sätze, Wiederholungen und Pausen fest."
                      action={
                        <Button onClick={() => setPickerDayId(currentDay.id)}>
                          <Plus className="h-4 w-4" />
                          Übung hinzufügen
                        </Button>
                      }
                      className="border-0"
                    />
                  ) : (
                    <ul className="space-y-2">
                      {currentDay.exercises.map((item, index) => (
                        <li key={item.id}>
                          <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 p-3">
                            <div className="flex shrink-0 flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => move(currentDay, index, -1)}
                                disabled={index === 0}
                                aria-label="Nach oben verschieben"
                                className="tap rounded p-0.5 text-subtle transition-colors hover:text-fg disabled:opacity-30"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => move(currentDay, index, 1)}
                                disabled={index === currentDay.exercises.length - 1}
                                aria-label="Nach unten verschieben"
                                className="tap rounded p-0.5 text-subtle transition-colors hover:text-fg disabled:opacity-30"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditExercise({ dayId: currentDay.id, item })}
                              className="tap min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-sm font-semibold text-fg">
                                {item.exercise.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-subtle">
                                {item.targetSets} Sätze × {item.repMin}
                                {item.repMax !== item.repMin ? `–${item.repMax}` : ''} Wdh. ·{' '}
                                {item.restSec}s Pause
                                {item.targetWeight ? ` · ${item.targetWeight} kg` : ''}
                              </p>
                              {item.notes ? (
                                <p className="mt-1 truncate text-xs text-muted">{item.notes}</p>
                              ) : null}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeExercise.mutate({
                                  dayId: currentDay.id,
                                  planExerciseId: item.id,
                                })
                              }
                              aria-label={`${item.exercise.name} entfernen`}
                              className="tap shrink-0 rounded-lg p-2 text-subtle transition-colors hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {currentDay.exercises.length > 0 ? (
                    <Button
                      variant="outline"
                      fullWidth
                      className="mt-3"
                      onClick={() => setPickerDayId(currentDay.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Übung hinzufügen
                    </Button>
                  ) : null}
                </div>

                {currentDay.exercises.length > 0 ? (
                  <div className="border-t border-border p-4">
                    <Button
                      size="lg"
                      fullWidth
                      onClick={() => router.push(`/workout/start?dayId=${currentDay.id}`)}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Diesen Tag jetzt trainieren
                    </Button>
                  </div>
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </PageShell>

      {/* Rename plan */}
      <PlanFormModal
        open={planModal}
        onClose={() => {
          setPlanModal(false);
          setFieldErrors({});
        }}
        initial={{ name: plan.name, description: plan.description }}
        errors={fieldErrors}
        loading={savePlan.isPending}
        onSubmit={(values) => savePlan.mutate(values)}
      />

      {/* Create / edit day */}
      <DayFormModal
        open={dayModal !== null}
        onClose={() => {
          setDayModal(null);
          setFieldErrors({});
        }}
        day={dayModal?.day}
        errors={fieldErrors}
        loading={saveDay.isPending}
        onSubmit={(values) => saveDay.mutate({ dayId: dayModal?.day?.id, values })}
      />

      {/* Exercise settings */}
      {editExercise ? (
        <PlanExerciseEditor
          planId={planId}
          dayId={editExercise.dayId}
          item={editExercise.item}
          onClose={() => setEditExercise(null)}
          onSaved={invalidate}
        />
      ) : null}

      <ExercisePicker
        open={pickerDayId !== null}
        onClose={() => setPickerDayId(null)}
        multiple
        excludeIds={currentDay?.exercises.map((item) => item.exercise.id) ?? []}
        onSelect={(exercises: ExerciseDto[]) => {
          if (!pickerDayId) return;
          exercises.forEach((exercise) =>
            addExercise.mutate({ dayId: pickerDayId, exerciseId: exercise.id }),
          );
        }}
      />

      <ConfirmDialog
        open={deleteDay !== null}
        onClose={() => setDeleteDay(null)}
        onConfirm={() => deleteDay && removeDay.mutate(deleteDay.id)}
        loading={removeDay.isPending}
        title="Trainingstag löschen?"
        message={`„${deleteDay?.name}“ wird aus dem Plan entfernt. Deine bereits absolvierten Workouts bleiben erhalten.`}
      />
    </>
  );
}

// --- Modals -----------------------------------------------------------------

function PlanFormModal({
  open,
  onClose,
  initial,
  errors,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: { name: string; description: string };
  errors: Record<string, string[]>;
  loading: boolean;
  onSubmit: (values: { name: string; description: string }) => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plan bearbeiten"
      footer={
        <Button fullWidth size="lg" onClick={() => onSubmit(form)} loading={loading}>
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={errors.name?.[0]}
        />
        <Textarea
          label="Beschreibung"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>
    </Modal>
  );
}

function DayFormModal({
  open,
  onClose,
  day,
  errors,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  day?: PlanDayDto;
  errors: Record<string, string[]>;
  loading: boolean;
  onSubmit: (values: { name: string; notes: string; weekday: number | null }) => void;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [weekday, setWeekday] = useState('');
  const [initialised, setInitialised] = useState(false);

  // Reset the form each time the modal is opened for a different day.
  if (open && !initialised) {
    setName(day?.name ?? '');
    setNotes(day?.notes ?? '');
    setWeekday(day?.weekday !== null && day?.weekday !== undefined ? String(day.weekday) : '');
    setInitialised(true);
  }
  if (!open && initialised) setInitialised(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={day ? 'Trainingstag bearbeiten' : 'Trainingstag hinzufügen'}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={() => onSubmit({ name, notes, weekday: weekday === '' ? null : Number(weekday) })}
        >
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name des Tages"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name?.[0]}
          placeholder="Push"
          autoFocus
        />
        <Select
          label="Fester Wochentag"
          value={weekday}
          onChange={(event) => setWeekday(event.target.value)}
          hint="Bestimmt, welcher Tag auf deinem Dashboard als „heute“ vorgeschlagen wird."
        >
          <option value="">Flexibel – kein fester Tag</option>
          {[1, 2, 3, 4, 5, 6, 0].map((index) => (
            <option key={index} value={index}>
              {weekdayName(index)}
            </option>
          ))}
        </Select>
        <Textarea
          label="Notizen (optional)"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Fokus auf saubere Technik, langsame Exzentrik."
        />
      </div>
    </Modal>
  );
}
