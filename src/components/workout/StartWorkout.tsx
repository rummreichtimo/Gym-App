'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { ErrorState } from '@/components/ui/States';
import type { WorkoutSessionDto } from '@/types';

/**
 * Bridge route: creates the session for the given plan day and forwards to the
 * live workout screen. Keeps "start workout" a single tap from the dashboard.
 */
export function StartWorkout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dayId = useSearchParams().get('dayId');
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      try {
        // Resume instead of failing if a workout is already running.
        const existing = await api.get<{ session: WorkoutSessionDto | null }>('/api/workouts/active');
        if (existing.session) {
          router.replace('/workout/active');
          return;
        }

        await api.post<{ session: WorkoutSessionDto }>('/api/workouts', dayId ? { dayId } : {});
        await queryClient.invalidateQueries({ queryKey: ['workout', 'active'] });
        router.replace('/workout/active');
      } catch (caught) {
        setError(errorMessage(caught, 'Das Workout konnte nicht gestartet werden.'));
      }
    }

    void run();
  }, [dayId, router, queryClient]);

  if (error) {
    return (
      <PageShell width="narrow">
        <ErrorState message={error} onRetry={() => router.replace('/workout')} />
      </PageShell>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
        <p className="text-sm">Workout wird vorbereitet…</p>
      </div>
    </div>
  );
}
