'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Apple, ChevronLeft, ChevronRight, Dumbbell, Scale } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { cn, formatDate, formatNumber, monthName, toDateKey, weekdayName } from '@/lib/utils';
import type { CalendarDayDto } from '@/types';

/**
 * Month grid showing completed workouts, planned days and which days have
 * nutrition or body data logged.
 */
export function WorkoutCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selected, setSelected] = useState<string | null>(toDateKey());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => api.get<{ days: CalendarDayDto[] }>(`/api/calendar?year=${year}&month=${month}`),
  });

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  // Monday-based leading offset for the grid.
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = data?.days ?? [];
  const selectedDay = days.find((day) => day.date === selected) ?? null;
  const todayKey = toDateKey();

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Vorheriger Monat"
            className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-semibold text-fg">
            {monthName(month - 1)} {year}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Nächster Monat"
            className="tap rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {[1, 2, 3, 4, 5, 6, 0].map((index) => (
            <div key={index} className="text-center text-[11px] font-medium text-subtle">
              {weekdayName(index, true)}
            </div>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`pad-${index}`} />
            ))}
            {days.map((day) => {
              const dayNumber = Number(day.date.slice(8));
              const trained = day.workouts.length > 0;
              const isToday = day.date === todayKey;
              const isSelected = day.date === selected;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelected(day.date)}
                  aria-label={`${formatDate(day.date)}${trained ? ', trainiert' : ''}`}
                  aria-pressed={isSelected}
                  className={cn(
                    'tap relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all',
                    trained
                      ? 'bg-brand font-bold text-brand-fg'
                      : day.plannedDayName
                        ? 'border border-dashed border-brand/50 text-fg'
                        : 'bg-surface-2 text-muted hover:bg-elevated',
                    isToday && !trained && 'ring-1 ring-inset ring-subtle',
                    isSelected && 'ring-2 ring-brand ring-offset-2 ring-offset-surface',
                  )}
                >
                  {dayNumber}
                  <span className="absolute bottom-1 flex gap-0.5">
                    {day.hasNutrition ? (
                      <span
                        className={cn(
                          'h-1 w-1 rounded-full',
                          trained ? 'bg-brand-fg/70' : 'bg-success',
                        )}
                      />
                    ) : null}
                    {day.hasMeasurement ? (
                      <span
                        className={cn('h-1 w-1 rounded-full', trained ? 'bg-brand-fg/70' : 'bg-info')}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-subtle">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-brand" />
            Trainiert
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-dashed border-brand/60" />
            Geplant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Ernährung
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-info" />
            Messung
          </span>
        </div>
      </Card>

      {selectedDay ? (
        <Card className="p-4">
          <h3 className="font-semibold text-fg">{formatDate(selectedDay.date, { weekday: true })}</h3>

          {selectedDay.workouts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {selectedDay.workouts.map((workout) => (
                <li key={workout.id}>
                  <Link
                    href={`/history/${workout.id}`}
                    className="tap flex items-center gap-3 rounded-xl bg-surface-2 p-3"
                  >
                    <Dumbbell className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                      {workout.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {formatNumber(Math.round(workout.volume))} kg
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : selectedDay.plannedDayName ? (
            <p className="mt-2 text-sm text-muted">
              Geplant: <span className="font-medium text-fg">{selectedDay.plannedDayName}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Kein Training an diesem Tag.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDay.hasNutrition ? (
              <Link
                href={`/nutrition?date=${selectedDay.date}`}
                className="tap inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-medium text-muted hover:text-fg"
              >
                <Apple className="h-3.5 w-3.5" />
                Ernährung ansehen
              </Link>
            ) : null}
            {selectedDay.hasMeasurement ? (
              <Link
                href="/progress"
                className="tap inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-medium text-muted hover:text-fg"
              >
                <Scale className="h-3.5 w-3.5" />
                Messung ansehen
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
