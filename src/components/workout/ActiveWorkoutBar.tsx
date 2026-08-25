'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatDuration } from '@/lib/utils';
import type { WorkoutSessionDto } from '@/types';

/**
 * Persistent "workout is running" bar. Lets the user leave the workout screen
 * (to look something up) and jump straight back in.
 */
export function ActiveWorkoutBar() {
  const pathname = usePathname();
  const [elapsed, setElapsed] = useState(0);

  const { data } = useQuery({
    queryKey: ['workout', 'active'],
    queryFn: () => api.get<{ session: WorkoutSessionDto | null }>('/api/workouts/active'),
    refetchInterval: 60_000,
  });

  const session = data?.session ?? null;
  const startedAt = session?.startedAt;

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Hide it while the user is already inside the live workout screen.
  if (!session || pathname.startsWith('/workout/active')) return null;

  return (
    <Link
      href="/workout/active"
      className="tap fixed inset-x-0 bottom-16 z-40 flex items-center gap-3 border-t border-brand/30 bg-brand px-4 py-3 text-brand-fg shadow-lg animate-fade-up lg:bottom-0 lg:left-64"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
        <Play className="h-4 w-4 fill-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{session.name} läuft</span>
        <span className="block text-xs opacity-90">Tippe, um fortzusetzen</span>
      </span>
      <span className="font-mono text-lg font-bold tabular-nums">{formatDuration(elapsed)}</span>
    </Link>
  );
}
