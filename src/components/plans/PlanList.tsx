'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ListChecks, Plus, Star, Trash2 } from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import type { PlanSummaryDto, ProfileDto } from '@/types';

export function PlanList() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setProfile } = useSession();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlanSummaryDto | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ plans: PlanSummaryDto[]; activePlanId: string | null }>('/api/plans'),
  });

  const createPlan = useMutation({
    mutationFn: () => api.post<{ plan: { id: string } }>('/api/plans', form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan erstellt', 'Füge jetzt deine Trainingstage hinzu.');
      setCreateOpen(false);
      setForm({ name: '', description: '' });
      setFieldErrors({});
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Plan konnte nicht erstellt werden', errorMessage(error));
    },
  });

  const activatePlan = useMutation({
    mutationFn: (planId: string) =>
      api.patch<{ profile: ProfileDto }>('/api/profile', { activePlanId: planId }),
    onSuccess: async (result) => {
      setProfile(result.profile);
      await queryClient.invalidateQueries();
      toast.success('Plan aktiviert', 'Dein Dashboard richtet sich jetzt nach diesem Plan.');
    },
    onError: (error) => toast.error('Plan konnte nicht aktiviert werden', errorMessage(error)),
  });

  const deletePlan = useMutation({
    mutationFn: (planId: string) => api.delete(`/api/plans/${planId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success('Plan gelöscht');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error('Plan konnte nicht gelöscht werden', errorMessage(error)),
  });

  return (
    <PageShell>
      <PageHeader
        title="Deine Trainingspläne"
        description="Erstelle Pläne mit eigenen Tagen, Übungen, Sätzen und Pausenzeiten."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Neuer Plan
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data && data.plans.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="Noch keine Trainingspläne"
          description="Lege deinen ersten Plan an – zum Beispiel Push / Pull / Legs oder Upper / Lower."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Plan erstellen
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data?.plans.map((plan) => (
            <li key={plan.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/plans/${plan.id}`} className="tap min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-fg">{plan.name}</h3>
                    <p className="mt-0.5 text-xs text-subtle">
                      {plan.dayCount} {plan.dayCount === 1 ? 'Tag' : 'Tage'} · {plan.exerciseCount}{' '}
                      {plan.exerciseCount === 1 ? 'Übung' : 'Übungen'}
                    </p>
                  </Link>
                  {plan.isActive ? (
                    <Badge tone="brand">
                      <Star className="h-3 w-3 fill-current" />
                      Aktiv
                    </Badge>
                  ) : null}
                </div>

                {plan.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{plan.description}</p>
                ) : null}

                <div className="mt-4 flex gap-2 pt-1">
                  <Link href={`/plans/${plan.id}`} className="flex-1">
                    <Button variant="outline" size="sm" fullWidth>
                      Bearbeiten
                    </Button>
                  </Link>
                  {!plan.isActive ? (
                    <Button
                      size="sm"
                      onClick={() => activatePlan.mutate(plan.id)}
                      loading={activatePlan.isPending && activatePlan.variables === plan.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aktivieren
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(plan)}
                    aria-label={`${plan.name} löschen`}
                    className="tap rounded-xl p-2 text-subtle transition-colors hover:bg-elevated hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Neuen Trainingsplan erstellen"
        description="Gib deinem Plan einen Namen. Tage und Übungen fügst du danach hinzu."
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => createPlan.mutate()}
            loading={createPlan.isPending}
          >
            Plan erstellen
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={fieldErrors.name?.[0]}
            placeholder="Push / Pull / Legs"
            autoFocus
          />
          <Textarea
            label="Beschreibung (optional)"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="6 Einheiten pro Woche mit Fokus auf Hypertrophie."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deletePlan.mutate(deleteTarget.id)}
        loading={deletePlan.isPending}
        title="Plan löschen?"
        message={`„${deleteTarget?.name}“ und alle darin enthaltenen Trainingstage werden gelöscht. Bereits absolvierte Workouts bleiben in deiner Historie erhalten.`}
      />
    </PageShell>
  );
}
