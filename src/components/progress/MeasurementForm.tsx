'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { displayToCm, displayToKg } from '@/lib/units';
import { toDateKey } from '@/lib/utils';
import type { MeasurementDto } from '@/types';

const FIELDS = [
  { key: 'chest', label: 'Brust' },
  { key: 'waist', label: 'Taille' },
  { key: 'hip', label: 'Hüfte' },
  { key: 'arm', label: 'Oberarm' },
  { key: 'thigh', label: 'Oberschenkel' },
  { key: 'calf', label: 'Wade' },
] as const;

/**
 * Body data entry. One entry per day - submitting the same date again updates
 * the existing measurement instead of creating a duplicate.
 */
export function MeasurementForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: MeasurementDto;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSession();

  const weightUnit = profile?.weightUnit ?? 'kg';
  const lengthUnit = profile?.lengthUnit ?? 'cm';

  const [form, setForm] = useState({
    date: initial?.date ?? toDateKey(),
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hip: '',
    arm: '',
    thigh: '',
    calf: '',
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors({});
  }

  /** Empty inputs stay null so partial entries are allowed. */
  function optional(value: string, convert: (input: number) => number) {
    if (value.trim() === '') return null;
    const parsed = Number(value.replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return Math.round(convert(parsed) * 100) / 100;
  }

  const save = useMutation({
    mutationFn: () =>
      api.post('/api/body/measurements', {
        date: form.date,
        weightKg: optional(form.weight, (value) => displayToKg(value, weightUnit)),
        bodyFat: optional(form.bodyFat, (value) => value),
        chestCm: optional(form.chest, (value) => displayToCm(value, lengthUnit)),
        waistCm: optional(form.waist, (value) => displayToCm(value, lengthUnit)),
        hipCm: optional(form.hip, (value) => displayToCm(value, lengthUnit)),
        armCm: optional(form.arm, (value) => displayToCm(value, lengthUnit)),
        thighCm: optional(form.thigh, (value) => displayToCm(value, lengthUnit)),
        calfCm: optional(form.calf, (value) => displayToCm(value, lengthUnit)),
        notes: form.notes,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['progress'] });
      await queryClient.invalidateQueries({ queryKey: ['measurements'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Messung gespeichert');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Messung konnte nicht gespeichert werden', errorMessage(error));
    },
  });

  const hasValue =
    form.weight || form.bodyFat || FIELDS.some((field) => form[field.key]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Messung eintragen"
      description="Trage ein, was du gemessen hast – alle Felder sind optional."
      footer={
        <Button
          fullWidth
          size="lg"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!hasValue}
        >
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Datum"
          type="date"
          value={form.date}
          max={toDateKey()}
          onChange={(event) => update('date', event.target.value)}
          error={fieldErrors.date?.[0]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Gewicht"
            type="number"
            inputMode="decimal"
            step="0.1"
            suffix={weightUnit}
            value={form.weight}
            onChange={(event) => update('weight', event.target.value)}
            error={fieldErrors.weightKg?.[0]}
            placeholder="80"
          />
          <Input
            label="Körperfett"
            type="number"
            inputMode="decimal"
            step="0.1"
            suffix="%"
            value={form.bodyFat}
            onChange={(event) => update('bodyFat', event.target.value)}
            error={fieldErrors.bodyFat?.[0]}
            placeholder="15"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted">Körpermaße ({lengthUnit})</p>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type="number"
                inputMode="decimal"
                step="0.1"
                suffix={lengthUnit}
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                error={fieldErrors[`${field.key}Cm`]?.[0]}
              />
            ))}
          </div>
        </div>

        <Textarea
          label="Notiz (optional)"
          value={form.notes}
          onChange={(event) => update('notes', event.target.value)}
          placeholder="Morgens nüchtern gemessen."
        />
      </div>
    </Modal>
  );
}
