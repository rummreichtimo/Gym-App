'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Dumbbell, Plus } from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { DIFFICULTIES, EQUIPMENT, MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import type { ExerciseDto } from '@/types';

export function ExerciseLibrary() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [scope, setScope] = useState<'all' | 'custom'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<{ exercises: ExerciseDto[] }>('/api/exercises'),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.exercises ?? []).filter((exercise) => {
      if (scope === 'custom' && !exercise.isCustom) return false;
      if (term && !exercise.name.toLowerCase().includes(term)) return false;
      if (
        muscleGroup !== 'all' &&
        exercise.muscleGroup !== muscleGroup &&
        !exercise.secondaryMuscles.includes(muscleGroup)
      ) {
        return false;
      }
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (difficulty !== 'all' && exercise.difficulty !== difficulty) return false;
      return true;
    });
  }, [data, search, muscleGroup, equipment, difficulty, scope]);

  // Grouped by primary muscle for a scannable list.
  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseDto[]>();
    for (const exercise of filtered) {
      const list = map.get(exercise.muscleGroup) ?? [];
      list.push(exercise);
      map.set(exercise.muscleGroup, list);
    }
    return [...map.entries()].sort((a, b) =>
      labelFor(MUSCLE_GROUPS, a[0]).localeCompare(labelFor(MUSCLE_GROUPS, b[0])),
    );
  }, [filtered]);

  const createExercise = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/api/exercises', values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Übung erstellt');
      setCreateOpen(false);
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Übungsdatenbank"
        description={`${data?.exercises.length ?? 0} Übungen mit Muskelgruppen, Equipment und Anleitung.`}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Eigene Übung
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Übung suchen, z. B. „Bank“" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            value={muscleGroup}
            onChange={(event) => setMuscleGroup(event.target.value)}
            aria-label="Muskelgruppe"
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
            aria-label="Equipment"
          >
            <option value="all">Alles Equipment</option>
            {EQUIPMENT.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
            aria-label="Schwierigkeit"
          >
            <option value="all">Jede Schwierigkeit</option>
            {DIFFICULTIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <Tabs
          size="sm"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Alle Übungen' },
            { value: 'custom', label: 'Nur eigene' },
          ]}
        />
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="Keine Übung gefunden"
          description="Passe Suche und Filter an oder erstelle deine eigene Übung."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Eigene Übung erstellen
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, exercises]) => (
            <section key={group}>
              <h3 className="mb-2 text-sm font-semibold text-muted">
                {labelFor(MUSCLE_GROUPS, group)}{' '}
                <span className="font-normal text-subtle">({exercises.length})</span>
              </h3>
              <ul className="space-y-1.5">
                {exercises.map((exercise) => (
                  <li key={exercise.id}>
                    <Link href={`/exercises/${exercise.id}`} className="tap block">
                      <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-subtle">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{exercise.name}</p>
                          <p className="mt-0.5 truncate text-xs text-subtle">
                            {labelFor(EQUIPMENT, exercise.equipment)} ·{' '}
                            {labelFor(DIFFICULTIES, exercise.difficulty)}
                          </p>
                        </div>
                        {exercise.isCustom ? <Badge tone="brand">Eigene</Badge> : null}
                        <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CustomExerciseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createExercise.mutate(values)}
        loading={createExercise.isPending}
        error={createExercise.error}
      />
    </PageShell>
  );
}

export function CustomExerciseModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  initial,
  title = 'Eigene Übung erstellen',
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  loading: boolean;
  error: unknown;
  initial?: ExerciseDto;
  title?: string;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    muscleGroup: initial?.muscleGroup ?? 'chest',
    equipment: initial?.equipment ?? 'barbell',
    difficulty: initial?.difficulty ?? 'intermediate',
    description: initial?.description ?? '',
    instructions: initial?.instructions.join('\n') ?? '',
    secondaryMuscles: initial?.secondaryMuscles ?? ([] as string[]),
  });

  const fieldErrors = error instanceof ApiClientError ? (error.details ?? {}) : {};
  const message =
    error instanceof ApiClientError && !error.details ? errorMessage(error) : null;

  function toggleSecondary(key: string) {
    setForm((current) => ({
      ...current,
      secondaryMuscles: current.secondaryMuscles.includes(key)
        ? current.secondaryMuscles.filter((item) => item !== key)
        : [...current.secondaryMuscles, key],
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button fullWidth size="lg" onClick={() => onSubmit(form)} loading={loading}>
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        {message ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {message}
          </div>
        ) : null}

        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={fieldErrors.name?.[0]}
          placeholder="Landmine Press"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Muskelgruppe"
            value={form.muscleGroup}
            onChange={(event) => setForm({ ...form, muscleGroup: event.target.value })}
            error={fieldErrors.muscleGroup?.[0]}
          >
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </Select>
          <Select
            label="Equipment"
            value={form.equipment}
            onChange={(event) => setForm({ ...form, equipment: event.target.value })}
            error={fieldErrors.equipment?.[0]}
          >
            {EQUIPMENT.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Schwierigkeit"
          value={form.difficulty}
          onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
        >
          {DIFFICULTIES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>

        <div>
          <p className="mb-2 text-sm font-medium text-muted">Sekundäre Muskelgruppen</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.filter((group) => group.key !== form.muscleGroup).map((group) => {
              const selected = form.secondaryMuscles.includes(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => toggleSecondary(group.key)}
                  aria-pressed={selected}
                  className={`tap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected ? 'bg-brand text-brand-fg' : 'bg-elevated text-muted hover:text-fg'
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Beschreibung (optional)"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Kurze Beschreibung der Übung."
        />
        <Textarea
          label="Anleitung (optional)"
          value={form.instructions}
          onChange={(event) => setForm({ ...form, instructions: event.target.value })}
          hint="Ein Schritt pro Zeile."
          rows={4}
          placeholder={'Stange in die Ecke stellen.\nMit beiden Händen greifen.\nExplosiv nach oben drücken.'}
        />
      </div>
    </Modal>
  );
}
