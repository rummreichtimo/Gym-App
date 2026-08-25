'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { MUSCLE_GROUPS, EQUIPMENT, labelFor } from '@/lib/constants';
import type { PlanExerciseDto } from '@/types';

/** Sets, rep range, target weight, rest and notes for one exercise in a plan. */
export function PlanExerciseEditor({
  planId,
  dayId,
  item,
  onClose,
  onSaved,
}: {
  planId: string;
  dayId: string;
  item: PlanExerciseDto;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    targetSets: String(item.targetSets),
    repMin: String(item.repMin),
    repMax: String(item.repMax),
    targetWeight: item.targetWeight === null ? '' : String(item.targetWeight),
    restSec: String(item.restSec),
    notes: item.notes,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/plans/${planId}/days/${dayId}/exercises/${item.id}`, {
        targetSets: Number(form.targetSets),
        repMin: Number(form.repMin),
        repMax: Number(form.repMax),
        targetWeight: form.targetWeight === '' ? null : Number(form.targetWeight.replace(',', '.')),
        restSec: Number(form.restSec),
        notes: form.notes,
      }),
    onSuccess: async () => {
      await onSaved();
      toast.success('Übung gespeichert');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setErrors(error.details);
        return;
      }
      toast.error('Speichern fehlgeschlagen', errorMessage(error));
    },
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors({});
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.exercise.name}
      description={`${labelFor(MUSCLE_GROUPS, item.exercise.muscleGroup)} · ${labelFor(
        EQUIPMENT,
        item.exercise.equipment,
      )}`}
      footer={
        <Button fullWidth size="lg" onClick={() => save.mutate()} loading={save.isPending}>
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Sätze"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={form.targetSets}
          onChange={(event) => update('targetSets', event.target.value)}
          error={errors.targetSets?.[0]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Wiederholungen von"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.repMin}
            onChange={(event) => update('repMin', event.target.value)}
            error={errors.repMin?.[0]}
          />
          <Input
            label="bis"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.repMax}
            onChange={(event) => update('repMax', event.target.value)}
            error={errors.repMax?.[0]}
          />
        </div>

        <Input
          label="Zielgewicht (optional)"
          type="number"
          inputMode="decimal"
          step="0.5"
          suffix="kg"
          value={form.targetWeight}
          onChange={(event) => update('targetWeight', event.target.value)}
          error={errors.targetWeight?.[0]}
          hint="Leer lassen, um dich an deiner letzten Leistung zu orientieren."
        />

        <div>
          <Input
            label="Pausenzeit"
            type="number"
            inputMode="numeric"
            suffix="Sek."
            value={form.restSec}
            onChange={(event) => update('restSec', event.target.value)}
            error={errors.restSec?.[0]}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[60, 90, 120, 180, 210].map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => update('restSec', String(seconds))}
                className="tap rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-fg"
              >
                {seconds >= 60 ? `${seconds / 60} min` : `${seconds}s`}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Notizen (optional)"
          value={form.notes}
          onChange={(event) => update('notes', event.target.value)}
          placeholder="Griff etwas enger, Pause an der Brust."
        />
      </div>
    </Modal>
  );
}
