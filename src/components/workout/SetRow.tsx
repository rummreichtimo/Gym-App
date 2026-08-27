'use client';

import { useEffect, useState } from 'react';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { kgToDisplay, displayToKg, weightStep, type WeightUnit } from '@/lib/units';
import type { SetDto } from '@/types';

export interface SetDraft {
  weight: string;
  reps: string;
  rir: string;
}

/**
 * One logged set. Optimised for gym use: large tap targets, numeric keypads and
 * +/- steppers so nothing has to be typed with sweaty hands.
 */
export function SetRow({
  set,
  index,
  weightUnit,
  previous,
  onSave,
  onDelete,
  saving,
}: {
  set: SetDto;
  index: number;
  weightUnit: WeightUnit;
  previous?: { weightKg: number; reps: number } | null;
  onSave: (values: { weightKg: number; reps: number; rir: number | null; completed: boolean }) => void;
  onDelete: () => void;
  saving?: boolean;
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rir, setRir] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Keep the inputs in sync when the server sends updated values.
  useEffect(() => {
    setWeight(set.weightKg > 0 ? String(round(kgToDisplay(set.weightKg, weightUnit))) : '');
    setReps(set.reps > 0 ? String(set.reps) : '');
    setRir(set.rir === null ? '' : String(set.rir));
  }, [set.weightKg, set.reps, set.rir, weightUnit]);

  const step = weightStep(weightUnit);

  function adjustWeight(delta: number) {
    const current = Number(weight.replace(',', '.')) || 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setWeight(String(next));
    setError(null);
  }

  function adjustReps(delta: number) {
    const current = Number(reps) || 0;
    setReps(String(Math.max(0, current + delta)));
    setError(null);
  }

  function complete() {
    const weightValue = Number(weight.replace(',', '.'));
    const repsValue = Number(reps);

    if (weight !== '' && (Number.isNaN(weightValue) || weightValue < 0)) {
      setError('Bitte gib ein gültiges Gewicht ein.');
      return;
    }
    if (!repsValue || repsValue <= 0) {
      setError('Bitte gib eine gültige Wiederholungszahl ein.');
      return;
    }

    setError(null);
    onSave({
      weightKg: displayToKg(weightValue || 0, weightUnit),
      reps: repsValue,
      rir: rir === '' ? null : Number(rir),
      completed: !set.completed ? true : set.completed,
    });
  }

  /** Prefills from the previous performance so logging is one tap. */
  function usePrevious() {
    if (!previous) return;
    setWeight(String(round(kgToDisplay(previous.weightKg, weightUnit))));
    setReps(String(previous.reps));
    setError(null);
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-2.5 transition-colors',
        set.completed ? 'border-success/30 bg-success/5' : 'border-border bg-surface-2',
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-lg text-sm font-bold',
            set.isWarmup
              ? 'bg-info/15 text-info'
              : set.completed
                ? 'bg-success/15 text-success'
                : 'bg-elevated text-muted',
          )}
        >
          {set.isWarmup ? 'W' : index + 1}
        </span>

        {/* Weight */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjustWeight(-step)}
            aria-label="Gewicht verringern"
            className="tap hidden h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted transition-colors hover:text-fg min-[360px]:flex"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value);
              setError(null);
            }}
            placeholder={previous ? String(round(kgToDisplay(previous.weightKg, weightUnit))) : '0'}
            aria-label={`Gewicht Satz ${index + 1} in ${weightUnit}`}
            className="h-9 w-full min-w-[2.75rem] rounded-lg border border-border bg-surface px-1 text-center text-sm font-semibold text-fg placeholder:text-subtle focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={() => adjustWeight(step)}
            aria-label="Gewicht erhöhen"
            className="tap hidden h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted transition-colors hover:text-fg min-[360px]:flex"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          </div>
          <span className="text-center text-[10px] font-medium uppercase tracking-wide text-subtle">
            {weightUnit}
          </span>
        </div>

        <span className="shrink-0 self-start pt-2.5 text-xs text-subtle">×</span>

        {/* Reps */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjustReps(-1)}
            aria-label="Wiederholungen verringern"
            className="tap hidden h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted transition-colors hover:text-fg min-[360px]:flex"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(event) => {
              setReps(event.target.value);
              setError(null);
            }}
            placeholder={previous ? String(previous.reps) : '0'}
            aria-label={`Wiederholungen Satz ${index + 1}`}
            className="h-9 w-full min-w-[2.75rem] rounded-lg border border-border bg-surface px-1 text-center text-sm font-semibold text-fg placeholder:text-subtle focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={() => adjustReps(1)}
            aria-label="Wiederholungen erhöhen"
            className="tap hidden h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted transition-colors hover:text-fg min-[360px]:flex"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          </div>
          <span className="text-center text-[10px] font-medium uppercase tracking-wide text-subtle">
            Wdh.
          </span>
        </div>

        <button
          type="button"
          onClick={complete}
          disabled={saving}
          aria-label={set.completed ? 'Satz aktualisieren' : 'Satz abschließen'}
          className={cn(
            'tap flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-lg transition-all active:scale-95',
            set.completed
              ? 'bg-success text-white'
              : 'bg-brand text-brand-fg',
            saving && 'opacity-60',
          )}
        >
          <Check className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-10">
        <label className="flex items-center gap-1.5 text-xs text-subtle">
          RIR
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            value={rir}
            onChange={(event) => setRir(event.target.value)}
            placeholder="–"
            aria-label={`RIR Satz ${index + 1}`}
            className="h-7 w-12 rounded-md border border-border bg-surface px-1 text-center text-xs font-semibold text-fg placeholder:text-subtle focus:border-brand focus:outline-none"
          />
        </label>

        {previous ? (
          <button
            type="button"
            onClick={usePrevious}
            className="tap rounded-md bg-elevated px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-fg"
          >
            Letztes Mal übernehmen
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Satz ${index + 1} löschen`}
          className="tap ml-auto rounded-md p-1.5 text-subtle transition-colors hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {error ? <p className="mt-1.5 pl-10 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
