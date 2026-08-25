'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, LineChart, Plus, Ruler, Scale } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TrendChart, BarSeriesChart } from '@/components/charts/Charts';
import { MeasurementForm } from './MeasurementForm';
import { MeasurementHistory } from './MeasurementHistory';
import { ProgressPhotos } from './ProgressPhotos';
import { useSession } from '@/components/session-provider';
import { cmToDisplay, kgToDisplay } from '@/lib/units';
import { formatDate, formatNumber } from '@/lib/utils';
import type { ProgressSeriesDto } from '@/types';

type Range = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

const RANGES: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Tage' },
  { value: '30d', label: '30 Tage' },
  { value: '3m', label: '3 Monate' },
  { value: '6m', label: '6 Monate' },
  { value: '1y', label: '1 Jahr' },
  { value: 'all', label: 'Alles' },
];

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: 'Brust',
  waist: 'Taille',
  hip: 'Hüfte',
  arm: 'Oberarm',
  thigh: 'Oberschenkel',
  calf: 'Wade',
};

export function ProgressView() {
  const { profile } = useSession();
  const [range, setRange] = useState<Range>('3m');
  const [tab, setTab] = useState<'charts' | 'measurements' | 'photos'>('charts');
  const [formOpen, setFormOpen] = useState(false);

  const weightUnit = profile?.weightUnit ?? 'kg';
  const lengthUnit = profile?.lengthUnit ?? 'cm';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['progress', range],
    queryFn: () => api.get<{ progress: ProgressSeriesDto }>(`/api/progress?range=${range}`),
  });

  const progress = data?.progress;

  /** Converts a metric series into the user's display unit and chart shape. */
  const toChart = (
    series: { date: string; value: number }[] | undefined,
    convert?: (value: number) => number,
  ) =>
    (series ?? []).map((point) => ({
      label: formatDate(point.date, { withYear: false }),
      value: convert ? Math.round(convert(point.value) * 10) / 10 : point.value,
    }));

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'charts', label: 'Diagramme' },
            { value: 'measurements', label: 'Messungen' },
            { value: 'photos', label: 'Fotos' },
          ]}
        />
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Messung eintragen
        </Button>
      </div>

      {tab === 'measurements' ? (
        <MeasurementHistory onAdd={() => setFormOpen(true)} />
      ) : tab === 'photos' ? (
        <ProgressPhotos />
      ) : (
        <>
          <Tabs
            className="mb-4"
            size="sm"
            value={range}
            onChange={setRange}
            options={RANGES}
          />

          {isLoading ? (
            <LoadingState rows={4} />
          ) : isError || !progress ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Körpergewicht"
                subtitle={`in ${weightUnit}`}
                icon={<Scale className="h-4 w-4" />}
                data={toChart(progress.bodyWeight, (value) => kgToDisplay(value, weightUnit))}
                unit={weightUnit}
                decimals={1}
                emptyHint="Trage dein Gewicht ein, um deinen Verlauf zu sehen."
              />

              <ChartCard
                title="Trainingsvolumen"
                subtitle="pro Trainingstag"
                icon={<LineChart className="h-4 w-4" />}
                data={toChart(progress.volume)}
                unit="kg"
                color="info"
                emptyHint="Absolviere Workouts, um dein Volumen zu verfolgen."
              />

              <ChartCard
                title={
                  progress.strengthExercise
                    ? `Kraftentwicklung · ${progress.strengthExercise.name}`
                    : 'Kraftentwicklung'
                }
                subtitle="geschätztes 1RM"
                icon={<LineChart className="h-4 w-4" />}
                data={toChart(progress.strength, (value) => kgToDisplay(value, weightUnit))}
                unit={weightUnit}
                decimals={1}
                color="success"
                emptyHint="Trainiere eine Übung mehrfach, um deine Kraftentwicklung zu sehen."
              />

              <Card>
                <CardHeader
                  title="Workout-Frequenz"
                  subtitle="Trainings pro Tag"
                  icon={<LineChart className="h-4 w-4" />}
                />
                <div className="p-4 sm:p-5">
                  {progress.frequency.length === 0 ? (
                    <EmptyState
                      title="Noch keine Workouts"
                      description="Deine Trainingsfrequenz erscheint hier, sobald du trainierst."
                      className="border-0 py-6"
                    />
                  ) : (
                    <BarSeriesChart
                      data={toChart(progress.frequency)}
                      unit="Workouts"
                      color="brand"
                    />
                  )}
                </div>
              </Card>

              <ChartCard
                title="Kalorien"
                subtitle="pro Tag"
                icon={<LineChart className="h-4 w-4" />}
                data={toChart(progress.calories)}
                unit="kcal"
                color="warning"
                emptyHint="Tracke deine Ernährung, um deine Kalorien zu sehen."
              />

              <ChartCard
                title="Protein"
                subtitle="pro Tag"
                icon={<LineChart className="h-4 w-4" />}
                data={toChart(progress.protein)}
                unit="g"
                decimals={1}
                color="success"
                emptyHint="Tracke deine Ernährung, um deine Proteinzufuhr zu sehen."
              />

              {progress.bodyFat.length > 0 ? (
                <ChartCard
                  title="Körperfettanteil"
                  subtitle="in Prozent"
                  icon={<Scale className="h-4 w-4" />}
                  data={toChart(progress.bodyFat)}
                  unit="%"
                  decimals={1}
                  color="danger"
                  emptyHint=""
                />
              ) : null}

              {Object.entries(progress.measurements)
                .filter(([, series]) => series.length > 0)
                .map(([key, series]) => (
                  <ChartCard
                    key={key}
                    title={MEASUREMENT_LABELS[key] ?? key}
                    subtitle={`Umfang in ${lengthUnit}`}
                    icon={<Ruler className="h-4 w-4" />}
                    data={toChart(series, (value) => cmToDisplay(value, lengthUnit))}
                    unit={lengthUnit}
                    decimals={1}
                    color="info"
                    emptyHint=""
                  />
                ))}
            </div>
          )}
        </>
      )}

      <MeasurementForm open={formOpen} onClose={() => setFormOpen(false)} />
    </PageShell>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  data,
  unit,
  decimals = 0,
  color = 'brand',
  emptyHint,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: { label: string; value: number }[];
  unit: string;
  decimals?: number;
  color?: 'brand' | 'success' | 'info' | 'warning' | 'danger';
  emptyHint: string;
}) {
  const latest = data[data.length - 1];
  const first = data[0];
  const delta = latest && first ? latest.value - first.value : 0;

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        action={
          latest ? (
            <div className="text-right">
              <p className="font-bold text-fg tabular-nums">
                {formatNumber(latest.value, decimals)}{' '}
                <span className="text-xs font-medium text-muted">{unit}</span>
              </p>
              {data.length > 1 && Math.abs(delta) > 0.05 ? (
                <p
                  className={`text-xs tabular-nums ${delta > 0 ? 'text-success' : 'text-danger'}`}
                >
                  {delta > 0 ? '+' : ''}
                  {formatNumber(delta, decimals)} {unit}
                </p>
              ) : null}
            </div>
          ) : undefined
        }
      />
      <div className="p-4 sm:p-5">
        {data.length < 2 ? (
          <EmptyState
            title="Noch nicht genug Daten"
            description={emptyHint || 'Es braucht mindestens zwei Einträge für einen Verlauf.'}
            className="border-0 py-6"
          />
        ) : (
          <TrendChart data={data} unit={unit} decimals={decimals} color={color} />
        )}
      </div>
    </Card>
  );
}
