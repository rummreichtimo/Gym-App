'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { formatLength, formatWeight } from '@/lib/units';
import { formatDate, formatNumber } from '@/lib/utils';
import type { MeasurementDto } from '@/types';

const FIELDS: { key: keyof MeasurementDto; label: string }[] = [
  { key: 'chestCm', label: 'Brust' },
  { key: 'waistCm', label: 'Taille' },
  { key: 'hipCm', label: 'Hüfte' },
  { key: 'armCm', label: 'Oberarm' },
  { key: 'thighCm', label: 'Oberschenkel' },
  { key: 'calfCm', label: 'Wade' },
];

export function MeasurementHistory({ onAdd }: { onAdd: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const [deleteTarget, setDeleteTarget] = useState<MeasurementDto | null>(null);

  const weightUnit = profile?.weightUnit ?? 'kg';
  const lengthUnit = profile?.lengthUnit ?? 'cm';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['measurements'],
    queryFn: () => api.get<{ measurements: MeasurementDto[] }>('/api/body/measurements'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/body/measurements/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['measurements'] });
      await queryClient.invalidateQueries({ queryKey: ['progress'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Eintrag gelöscht');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error('Eintrag konnte nicht gelöscht werden', errorMessage(error)),
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const measurements = data?.measurements ?? [];

  if (measurements.length === 0) {
    return (
      <EmptyState
        icon={<Scale className="h-6 w-6" />}
        title="Noch keine Messungen"
        description="Trage Gewicht und Körpermaße regelmäßig ein, um deinen Verlauf zu sehen."
        action={<Button onClick={onAdd}>Erste Messung eintragen</Button>}
      />
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {measurements.map((entry) => (
          <li key={entry.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{formatDate(entry.date, { weekday: true })}</p>
                  <p className="mt-0.5 text-sm text-muted tabular-nums">
                    {entry.weightKg !== null ? formatWeight(entry.weightKg, weightUnit) : '—'}
                    {entry.bodyFat !== null ? ` · ${formatNumber(entry.bodyFat, 1)} % KFA` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(entry)}
                  aria-label="Eintrag löschen"
                  className="tap shrink-0 rounded-lg p-2 text-subtle transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {FIELDS.some((field) => entry[field.key] !== null) ? (
                <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 sm:grid-cols-6">
                  {FIELDS.map((field) => {
                    const value = entry[field.key] as number | null;
                    if (value === null) return null;
                    return (
                      <div key={String(field.key)}>
                        <dt className="truncate text-[11px] text-subtle">{field.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
                          {formatLength(value, lengthUnit)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}

              {entry.notes ? (
                <p className="mt-3 border-t border-border pt-3 text-sm text-muted">{entry.notes}</p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
        title="Messung löschen?"
        message={`Der Eintrag vom ${deleteTarget ? formatDate(deleteTarget.date) : ''} wird dauerhaft entfernt.`}
      />
    </>
  );
}
