'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ExercisePicker } from '@/components/exercises/ExercisePicker';
import { GOAL_TYPES } from '@/lib/constants';
import type { ExerciseDto, GoalDto } from '@/types';

const EMPTY = {
  title: '',
  type: 'exercise_1rm',
  exerciseId: '',
  exerciseName: '',
  startValue: '',
  targetValue: '',
  unit: 'kg',
  direction: 'increase' as 'increase' | 'decrease',
  deadline: '',
};

export function GoalForm({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  goal: GoalDto | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Load the goal being edited, or reset for a new one.
  useEffect(() => {
    if (!open) return;
    if (goal) {
      setForm({
        title: goal.title,
        type: goal.type,
        exerciseId: goal.exerciseId ?? '',
        exerciseName: goal.exerciseName ?? '',
        startValue: String(goal.startValue),
        targetValue: String(goal.targetValue),
        unit: goal.unit,
        direction: goal.direction,
        deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
      });
    } else {
      setForm(EMPTY);
    }
    setFieldErrors({});
  }, [open, goal]);

  const typeConfig = GOAL_TYPES.find((item) => item.key === form.type);

  function selectType(type: string) {
    const config = GOAL_TYPES.find((item) => item.key === type);
    setForm((current) => ({
      ...current,
      type,
      unit: config?.unit ?? current.unit,
      direction: (config?.direction as 'increase' | 'decrease') ?? 'increase',
      exerciseId: config?.needsExercise ? current.exerciseId : '',
      exerciseName: config?.needsExercise ? current.exerciseName : '',
    }));
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        exerciseId: form.exerciseId || null,
        startValue: Number(form.startValue.replace(',', '.')) || 0,
        targetValue: Number(form.targetValue.replace(',', '.')),
        unit: form.unit,
        direction: form.direction,
        deadline: form.deadline || null,
      };
      return goal ? api.patch(`/api/goals/${goal.id}`, payload) : api.post('/api/goals', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(goal ? 'Ziel gespeichert' : 'Ziel erstellt');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Ziel konnte nicht gespeichert werden', errorMessage(error));
    },
  });

  return (
    <>
      <Modal
        open={open && !pickerOpen}
        onClose={onClose}
        title={goal ? 'Ziel bearbeiten' : 'Neues Ziel'}
        description="Bei den meisten Zieltypen wird dein aktueller Stand automatisch aus deinen Daten berechnet."
        footer={
          <Button fullWidth size="lg" onClick={() => save.mutate()} loading={save.isPending}>
            Speichern
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Titel"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            error={fieldErrors.title?.[0]}
            placeholder="100 kg Bankdrücken"
            autoFocus
          />

          <Select
            label="Zieltyp"
            value={form.type}
            onChange={(event) => selectType(event.target.value)}
          >
            {GOAL_TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </Select>

          {typeConfig?.needsExercise ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">Übung</p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="tap flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface-2 px-3.5 text-left text-fg transition-colors hover:border-subtle"
              >
                <span className={form.exerciseName ? '' : 'text-subtle'}>
                  {form.exerciseName || 'Übung auswählen'}
                </span>
                <span className="text-xs font-semibold text-brand">Ändern</span>
              </button>
              {fieldErrors.exerciseId?.[0] ? (
                <p className="mt-1.5 text-sm text-danger">{fieldErrors.exerciseId[0]}</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Startwert"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.startValue}
              onChange={(event) => setForm({ ...form, startValue: event.target.value })}
              error={fieldErrors.startValue?.[0]}
              hint="Dein Ausgangspunkt."
            />
            <Input
              label="Zielwert"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.targetValue}
              onChange={(event) => setForm({ ...form, targetValue: event.target.value })}
              error={fieldErrors.targetValue?.[0]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Einheit"
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              placeholder="kg"
            />
            <Select
              label="Richtung"
              value={form.direction}
              onChange={(event) =>
                setForm({ ...form, direction: event.target.value as 'increase' | 'decrease' })
              }
            >
              <option value="increase">Wert soll steigen</option>
              <option value="decrease">Wert soll sinken</option>
            </Select>
          </div>

          <Input
            label="Zieldatum (optional)"
            type="date"
            value={form.deadline}
            onChange={(event) => setForm({ ...form, deadline: event.target.value })}
          />
        </div>
      </Modal>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Übung für dieses Ziel"
        onSelect={(exercises: ExerciseDto[]) => {
          const exercise = exercises[0];
          if (!exercise) return;
          setForm((current) => ({
            ...current,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            title: current.title || `${exercise.name} steigern`,
          }));
        }}
      />
    </>
  );
}
