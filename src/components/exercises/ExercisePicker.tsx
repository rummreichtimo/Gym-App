'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Dumbbell } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { EQUIPMENT, MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ExerciseDto } from '@/types';

/**
 * Searchable exercise browser. Used to add exercises to a plan day, to a
 * running workout, and to pick a target exercise for a goal.
 */
export function ExercisePicker({
  open,
  onClose,
  onSelect,
  excludeIds = [],
  multiple = false,
  title = 'Übung hinzufügen',
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (exercises: ExerciseDto[]) => void;
  excludeIds?: string[];
  multiple?: boolean;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [selected, setSelected] = useState<ExerciseDto[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<{ exercises: ExerciseDto[] }>('/api/exercises'),
    enabled: open,
  });

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  // Filtering happens client-side: the library is small, which keeps the search
  // instant while typing.
  const filtered = useMemo(() => {
    const list = data?.exercises ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((exercise) => {
      if (excluded.has(exercise.id)) return false;
      if (term && !exercise.name.toLowerCase().includes(term)) return false;
      if (
        muscleGroup !== 'all' &&
        exercise.muscleGroup !== muscleGroup &&
        !exercise.secondaryMuscles.includes(muscleGroup)
      ) {
        return false;
      }
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      return true;
    });
  }, [data, search, muscleGroup, equipment, excluded]);

  function close() {
    setSelected([]);
    setSearch('');
    onClose();
  }

  function toggle(exercise: ExerciseDto) {
    if (!multiple) {
      onSelect([exercise]);
      close();
      return;
    }
    setSelected((current) =>
      current.some((item) => item.id === exercise.id)
        ? current.filter((item) => item.id !== exercise.id)
        : [...current, exercise],
    );
  }

  function confirm() {
    onSelect(selected);
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="lg"
      footer={
        multiple ? (
          <Button fullWidth size="lg" onClick={confirm} disabled={selected.length === 0}>
            {selected.length === 0
              ? 'Übungen auswählen'
              : `${selected.length} ${selected.length === 1 ? 'Übung' : 'Übungen'} hinzufügen`}
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4 space-y-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Übung suchen, z. B. „Bank“"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={muscleGroup}
            onChange={(event) => setMuscleGroup(event.target.value)}
            aria-label="Muskelgruppe filtern"
          >
            <option value="all">Alle Muskelgruppen</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </Select>
          <Select
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            aria-label="Equipment filtern"
          >
            <option value="all">Alles Equipment</option>
            {EQUIPMENT.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Keine Übung gefunden"
          description="Passe deine Suche oder die Filter an – oder lege eine eigene Übung an."
        />
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((exercise) => {
            const isSelected = selected.some((item) => item.id === exercise.id);
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => toggle(exercise)}
                  className={cn(
                    'tap flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    isSelected
                      ? 'border-brand bg-brand/10'
                      : 'border-transparent bg-surface-2 hover:border-border',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {exercise.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-subtle">
                      {labelFor(MUSCLE_GROUPS, exercise.muscleGroup)} ·{' '}
                      {labelFor(EQUIPMENT, exercise.equipment)}
                    </span>
                  </span>
                  {multiple ? (
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors',
                        isSelected ? 'border-brand bg-brand' : 'border-subtle',
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5 text-brand-fg" /> : null}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
