'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Dumbbell, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate, formatNumber, formatTime, relativeDay } from '@/lib/utils';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  verified: boolean;
  lastSeenAt: string | null;
  workouts: number;
  workoutsLast30Days: number;
  lastWorkoutAt: string | null;
  totalVolume: number;
  isAdmin: boolean;
}

interface AdminOverview {
  users: AdminUserRow[];
  totals: { users: number; verified: number; newLast7Days: number; activeLast30Days: number };
}

type SortKey = 'newest' | 'active' | 'name';

export function AdminView() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminOverview>('/api/admin/users'),
    // Live enough for an overview without hammering the database.
    refetchInterval: 60_000,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (data?.users ?? []).filter(
      (row) => !term || `${row.name} ${row.email}`.toLowerCase().includes(term),
    );

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'active') {
        if (b.workoutsLast30Days !== a.workoutsLast30Days) {
          return b.workoutsLast30Days - a.workoutsLast30Days;
        }
        return b.workouts - a.workouts;
      }
      return b.registeredAt.localeCompare(a.registeredAt);
    });
  }, [data, search, sort]);

  if (isLoading) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell>
        <ErrorState onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={<Users className="h-4 w-4" />} label="Nutzer" value={String(data.totals.users)} />
        <Tile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Bestätigt"
          value={`${data.totals.verified} / ${data.totals.users}`}
        />
        <Tile
          icon={<UserPlus className="h-4 w-4" />}
          label="Neu (7 Tage)"
          value={String(data.totals.newLast7Days)}
        />
        <Tile
          icon={<Dumbbell className="h-4 w-4" />}
          label="Aktiv (30 Tage)"
          value={String(data.totals.activeLast30Days)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="min-w-[12rem] flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Name oder E-Mail suchen…"
        />
        <Tabs
          size="sm"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'newest', label: 'Neueste' },
            { value: 'active', label: 'Aktivste' },
            { value: 'name', label: 'Name' },
          ]}
        />
        <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={search ? 'Keine Treffer' : 'Noch keine Nutzer'}
          description={
            search
              ? 'Für diese Suche gibt es keine Nutzer.'
              : 'Sobald sich jemand registriert, erscheint er hier.'
          }
        />
      ) : (
        <>
          {/* Karten auf dem Handy, Tabelle ab lg - eine Tabelle ist auf 390px unlesbar. */}
          <ul className="space-y-2 lg:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{row.name}</p>
                      <p className="truncate text-xs text-subtle">{row.email}</p>
                    </div>
                    <StatusBadges row={row} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs">
                    <Field label="Registriert" value={formatDate(row.registeredAt.slice(0, 10))} />
                    <Field label="Zuletzt aktiv" value={lastSeenLabel(row)} />
                    <Field label="Workouts" value={`${row.workouts} (30 T.: ${row.workoutsLast30Days})`} />
                    <Field
                      label="Volumen"
                      value={row.totalVolume > 0 ? `${formatNumber(row.totalVolume)} kg` : '—'}
                    />
                  </dl>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-subtle">
                    <Th>Name</Th>
                    <Th>E-Mail</Th>
                    <Th>Registriert</Th>
                    <Th>Zuletzt aktiv</Th>
                    <Th className="text-right">Workouts</Th>
                    <Th className="text-right">30 Tage</Th>
                    <Th className="text-right">Volumen</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-surface-2">
                      <Td className="font-semibold text-fg">{row.name}</Td>
                      <Td className="text-muted">{row.email}</Td>
                      <Td className="whitespace-nowrap text-muted">
                        {formatDate(row.registeredAt.slice(0, 10))}
                      </Td>
                      <Td className="whitespace-nowrap text-muted">{lastSeenLabel(row)}</Td>
                      <Td className="text-right tabular-nums text-fg">{row.workouts}</Td>
                      <Td className="text-right tabular-nums text-fg">{row.workoutsLast30Days}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {row.totalVolume > 0 ? `${formatNumber(row.totalVolume)} kg` : '—'}
                      </Td>
                      <Td>
                        <StatusBadges row={row} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle">
        <Clock className="h-3.5 w-3.5" />
        Stand {formatTime(new Date(dataUpdatedAt))} Uhr · aktualisiert sich jede Minute automatisch
      </p>
    </PageShell>
  );
}

function lastSeenLabel(row: AdminUserRow): string {
  const stamp = row.lastWorkoutAt ?? row.lastSeenAt;
  if (!stamp) return 'Noch nie';
  return relativeDay(stamp.slice(0, 10));
}

function StatusBadges({ row }: { row: AdminUserRow }) {
  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-1">
      {row.isAdmin ? (
        <Badge tone="brand">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </Badge>
      ) : null}
      {row.verified ? (
        <Badge tone="success">Bestätigt</Badge>
      ) : (
        <Badge tone="warning">Unbestätigt</Badge>
      )}
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-brand">
          {icon}
        </span>
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 truncate text-xl font-bold text-fg tabular-nums">{value}</p>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-subtle">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-fg">{value}</dd>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-medium ${className ?? ''}`}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ''}`}>{children}</td>;
}
