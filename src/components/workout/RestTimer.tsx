'use client';

import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { RestTimerState } from '@/hooks/useRestTimer';

/**
 * Floating rest countdown. Sits above the tab bar so it stays visible while the
 * user scrolls through their exercises.
 */
export function RestTimer({ timer }: { timer: RestTimerState }) {
  if (!timer.active) return null;

  const progress = timer.duration > 0 ? timer.remaining / timer.duration : 0;
  const almostDone = timer.remaining <= 10;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-2 lg:bottom-4 lg:left-64">
      <div
        className={cn(
          'relative mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border bg-elevated p-3 shadow-card animate-fade-up',
          almostDone ? 'border-brand' : 'border-border',
        )}
      >
        {/* Progress fill behind the controls. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 -z-10 bg-brand/10 transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">Pause</p>
          <p
            className={cn(
              'font-mono text-2xl font-bold tabular-nums transition-colors',
              almostDone ? 'text-brand' : 'text-fg',
            )}
          >
            {formatDuration(timer.remaining)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => timer.addSeconds(-15)}
          className="tap h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-muted transition-colors hover:text-fg"
          aria-label="15 Sekunden abziehen"
        >
          −15s
        </button>
        <button
          type="button"
          onClick={() => timer.addSeconds(15)}
          className="tap h-10 rounded-xl bg-surface-2 px-3 text-sm font-semibold text-muted transition-colors hover:text-fg"
          aria-label="15 Sekunden hinzufügen"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={() => (timer.running ? timer.pause() : timer.resume())}
          aria-label={timer.running ? 'Pausieren' : 'Fortsetzen'}
          className="tap flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-fg"
        >
          {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button
          type="button"
          onClick={timer.reset}
          aria-label="Zurücksetzen"
          className="tap flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors hover:text-fg"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={timer.stop}
          aria-label="Timer beenden"
          className="tap flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
