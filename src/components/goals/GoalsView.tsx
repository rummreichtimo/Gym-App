'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, Target, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { GoalForm } from './GoalForm';
import { GOAL_TYPES, labelFor } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/utils';
import type { GoalDto } from '@/types';

export function GoalsView() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<'active' | 'achieved' | 'all'>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalDto | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['goals', status],
    queryFn: () => api.get<{ goals: GoalDto[] }>(`/api/goals?status=${status}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/goals/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ziel gelöscht');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error('Ziel konnte nicht gelöscht werden', errorMessage(error)),
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.patch(`/api/goals/${id}`, { status: 'achieved' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Ziel als erreicht markiert');
    },
    onError: (error) => toast.error('Ziel konnte nicht aktualisiert werden', errorMessage(error)),
  });

  const goals = data?.goals ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Deine Ziele"
        description="IronPath aktualisiert deinen Fortschritt automatisch aus Training, Körperdaten und Ernährung."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Neues Ziel
          </Button>
        }
      />

      <Tabs
        className="mb-4"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'active', label: 'Aktiv' },
          { value: 'achieved', label: 'Erreicht' },
          { value: 'all', label: 'Alle' },
        ]}
      />

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title={status === 'achieved' ? 'Noch keine erreichten Ziele' : 'Noch keine Ziele'}
          description="Setze dir ein konkretes Ziel – zum Beispiel 100 kg Bankdrücken oder 4 Workouts pro Woche."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Ziel erstellen
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGoal(goal)}
                    className="tap min-w-0 flex-1 text-left"
                  >
                    <h3 className="truncate font-semibold text-fg">{goal.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-subtle">
                      {labelFor(GOAL_TYPES, goal.type)}
                      {goal.exerciseName ? ` · ${goal.exerciseName}` : ''}
                    </p>
                  </button>
                  {goal.status === 'achieved' ? (
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" />
                      Erreicht
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold text-fg tabular-nums">
                      {formatNumber(goal.currentValue, goal.currentValue % 1 === 0 ? 0 : 1)}
                      <span className="ml-1 text-xs font-medium text-muted">{goal.unit}</span>
                    </span>
                    <span className="text-xs text-subtle tabular-nums">
                      Ziel: {formatNumber(goal.targetValue, goal.targetValue % 1 === 0 ? 0 : 1)}{' '}
                      {goal.unit}
                    </span>
                  </div>
                  <ProgressBar
                    value={goal.progress * 100}
                    max={100}
                    color={goal.status === 'achieved' ? 'success' : 'brand'}
                    showOverflow={false}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {goal.status === 'achieved'
                      ? 'Ziel erreicht – stark!'
                      : goal.remaining > 0
                        ? `Noch ${formatNumber(goal.remaining, goal.remaining % 1 === 0 ? 0 : 1)} ${goal.unit} · ${Math.round(goal.progress * 100)} %`
                        : `${Math.round(goal.progress * 100)} % erreicht`}
                  </p>
                  {goal.deadline ? (
                    <p className="mt-1 text-xs text-subtle">
                      Bis {formatDate(goal.deadline.slice(0, 10))}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  {goal.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => complete.mutate(goal.id)}
                      loading={complete.isPending && complete.variables === goal.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Als erreicht markieren
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(goal)}
                    aria-label={`${goal.title} löschen`}
                    className="tap ml-auto rounded-xl p-2 text-subtle transition-colors hover:bg-elevated hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <GoalForm
        open={formOpen || editGoal !== null}
        goal={editGoal}
        onClose={() => {
          setFormOpen(false);
          setEditGoal(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
        title="Ziel löschen?"
        message={`„${deleteTarget?.title}“ wird dauerhaft gelöscht.`}
      />
    </PageShell>
  );
}
