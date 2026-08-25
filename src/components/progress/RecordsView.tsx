'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useSession } from '@/components/session-provider';
import { PR_LABELS, type PrType } from '@/lib/fitness';
import { MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import { formatWeight } from '@/lib/units';
import { formatDate, formatNumber } from '@/lib/utils';
import type { PersonalRecordDto } from '@/types';

interface RecordsResponse {
  records: PersonalRecordDto[];
  groups: { exercise: PersonalRecordDto['exercise']; records: PersonalRecordDto[] }[];
}

export function RecordsView() {
  const { profile } = useSession();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['records'],
    queryFn: () => api.get<RecordsResponse>('/api/records'),
  });

  const weightUnit = profile?.weightUnit ?? 'kg';

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.groups ?? [];
    return (data?.groups ?? []).filter((group) =>
      group.exercise.name.toLowerCase().includes(term),
    );
  }, [data, search]);

  function formatValue(record: PersonalRecordDto) {
    if (record.type === 'max_reps') {
      return `${record.reps} Wdh. bei ${formatWeight(record.weightKg ?? 0, weightUnit)}`;
    }
    if (record.type === 'max_volume') return `${formatNumber(Math.round(record.value))} kg`;
    if (record.type === 'est_1rm') return formatWeight(record.value, weightUnit, 1);
    return `${formatWeight(record.value, weightUnit)} × ${record.reps}`;
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState rows={4} />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <ErrorState onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  if ((data?.groups.length ?? 0) === 0) {
    return (
      <PageShell>
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Noch keine Rekorde"
          description="IronPath erkennt deine Bestleistungen automatisch, sobald du Sätze in einem Workout einträgst."
          action={
            <Link href="/workout">
              <Button>Workout starten</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SearchInput
        className="mb-4"
        value={search}
        onChange={setSearch}
        placeholder="Übung suchen…"
      />

      {groups.length === 0 ? (
        <EmptyState title="Keine Treffer" description="Für diese Suche gibt es keine Rekorde." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => {
            const headline = group.records.find((record) => record.type === 'est_1rm');
            return (
              <li key={group.exercise.id}>
                <Card className="h-full">
                  <Link
                    href={`/exercises/${group.exercise.id}`}
                    className="tap flex items-center gap-3 border-b border-border p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/12 text-warning">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">
                        {group.exercise.name}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {labelFor(MUSCLE_GROUPS, group.exercise.muscleGroup)}
                        {headline ? ` · e1RM ${formatWeight(headline.value, weightUnit, 1)}` : ''}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                  </Link>

                  <ul className="divide-y divide-border">
                    {group.records
                      .slice()
                      .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
                      .map((record) => (
                        <li key={record.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-fg">
                              {PR_LABELS[record.type]}
                            </span>
                            <span className="block text-xs text-subtle">
                              {formatDate(record.achievedAt.slice(0, 10))}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-bold text-fg tabular-nums">
                            {formatValue(record)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}

const ORDER: PrType[] = ['est_1rm', 'max_weight', 'max_reps', 'max_volume'];
