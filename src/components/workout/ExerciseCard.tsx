'use client';

import { useState } from 'react';
import { ChevronDown, Lightbulb, MoreVertical, Plus, Timer, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SetRow } from './SetRow';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { formatWeight, type WeightUnit } from '@/lib/units';
import { MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import type { SessionExerciseDto } from '@/types';

/**
 * One exercise inside the running workout: plan target, last performance,
 * overload suggestion and the set list.
 */
export function ExerciseCard({
  entry,
  weightUnit,
  onAddSet,
  onSaveSet,
  onDeleteSet,
  onRemoveExercise,
  onStartRest,
  savingSetId,
  addingSet,
}: {
  entry: SessionExerciseDto;
  weightUnit: WeightUnit;
  onAddSet: (isWarmup: boolean) => void;
  onSaveSet: (
    setId: string,
    values: { weightKg: number; reps: number; rir: number | null; completed: boolean },
  ) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: () => void;
  onStartRest: (seconds: number) => void;
  savingSetId: string | null;
  addingSet: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  const workingSets = entry.sets.filter((set) => !set.isWarmup);
  const completed = entry.sets.filter((set) => set.completed && !set.isWarmup).length;
  const targetSets = entry.target?.sets ?? 0;
  const volume = entry.sets
    .filter((set) => set.completed && !set.isWarmup)
    .reduce((sum, set) => sum + set.weightKg * set.reps, 0);

  return (
    <Card className="animate-fade-up">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-fg">{entry.exercise.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
            <span>{labelFor(MUSCLE_GROUPS, entry.exercise.muscleGroup)}</span>
            {entry.target ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {entry.target.sets} × {entry.target.repMin}
                  {entry.target.repMax !== entry.target.repMin ? `–${entry.target.repMax}` : ''} Wdh.
                </span>
              </>
            ) : null}
            {volume > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{formatNumber(Math.round(volume))} kg Volumen</span>
              </>
            ) : null}
          </p>
        </div>

        {targetSets > 0 ? (
          <Badge tone={completed >= targetSets ? 'success' : 'default'}>
            {completed} / {targetSets}
          </Badge>
        ) : null}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Optionen"
            aria-expanded={menuOpen}
            className="tap rounded-lg p-1.5 text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
              <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-border bg-elevated shadow-card animate-scale-in">
                <button
                  type="button"
                  onClick={() => {
                    onAddSet(true);
                    setMenuOpen(false);
                  }}
                  className="tap flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-fg transition-colors hover:bg-surface-2"
                >
                  <Plus className="h-4 w-4" />
                  Aufwärmsatz hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartRest(entry.restSec);
                    setMenuOpen(false);
                  }}
                  className="tap flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-fg transition-colors hover:bg-surface-2"
                >
                  <Timer className="h-4 w-4" />
                  Pause starten ({entry.restSec}s)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveExercise();
                    setMenuOpen(false);
                  }}
                  className="tap flex w-full items-center gap-2 border-t border-border px-3.5 py-2.5 text-left text-sm text-danger transition-colors hover:bg-surface-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Übung entfernen
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Progressive overload suggestion */}
      {entry.suggestion ? (
        <div className="mx-4 mb-3 flex gap-2.5 rounded-xl border border-brand/25 bg-brand/8 p-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{entry.suggestion.headline}</p>
            <p className="mt-0.5 text-xs text-muted">{entry.suggestion.detail}</p>
          </div>
        </div>
      ) : null}

      {/* Previous performance */}
      {entry.previous ? (
        <div className="mx-4 mb-3">
          <button
            type="button"
            onClick={() => setShowPrevious((open) => !open)}
            aria-expanded={showPrevious}
            className="tap flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-left"
          >
            <span className="min-w-0 flex-1 text-xs text-muted">
              Letztes Training ·{' '}
              <span className="text-fg">{formatDate(entry.previous.date, { withYear: false })}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-subtle transition-transform',
                showPrevious && 'rotate-180',
              )}
            />
          </button>
          {showPrevious ? (
            <ul className="mt-1.5 space-y-1 rounded-xl bg-surface-2 p-3 animate-fade-in">
              {entry.previous.sets.map((set, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 text-xs text-subtle">{index + 1}</span>
                  <span className="font-semibold text-fg">
                    {formatWeight(set.weightKg, weightUnit)} × {set.reps}
                  </span>
                  {set.rir !== null ? (
                    <span className="text-xs text-subtle">RIR {set.rir}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Sets */}
      <div className="space-y-2 px-4 pb-4">
        {entry.sets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-subtle">
            Noch keine Sätze. Füge deinen ersten Satz hinzu.
          </p>
        ) : (
          entry.sets.map((set) => (
            <SetRow
              key={set.id}
              set={set}
              index={set.isWarmup ? 0 : workingSets.findIndex((item) => item.id === set.id)}
              weightUnit={weightUnit}
              previous={entry.previous?.sets[workingSets.findIndex((item) => item.id === set.id)] ?? null}
              saving={savingSetId === set.id}
              onSave={(values) => onSaveSet(set.id, values)}
              onDelete={() => onDeleteSet(set.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => onAddSet(false)}
          disabled={addingSet}
          className="tap flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Satz hinzufügen
        </button>
      </div>
    </Card>
  );
}
