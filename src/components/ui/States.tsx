import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-elevated', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Wird geladen">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-brand">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message = 'Die Daten konnten nicht geladen werden. Bitte versuche es erneut.',
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-danger" />
      <p className="max-w-sm text-sm text-fg">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="tap mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-elevated px-4 text-sm font-semibold text-fg transition-colors hover:bg-elevated/70"
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
      ) : null}
    </div>
  );
}
