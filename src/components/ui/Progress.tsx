import { cn } from '@/lib/utils';
import { clamp } from '@/lib/utils';

export function ProgressBar({
  value,
  max,
  color = 'brand',
  className,
  showOverflow = true,
}: {
  value: number;
  max: number;
  color?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  showOverflow?: boolean;
}) {
  const ratio = max > 0 ? value / max : 0;
  const percent = clamp(ratio * 100, 0, 100);
  const over = showOverflow && ratio > 1;

  const colors = {
    brand: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-elevated', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', over ? 'bg-danger' : colors[color])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = 'brand',
  children,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
  className?: string;
}) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const over = max > 0 && value / max > 1;

  const strokes = {
    brand: 'stroke-brand',
    success: 'stroke-success',
    warning: 'stroke-warning',
    danger: 'stroke-danger',
    info: 'stroke-info',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-elevated"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('fill-none transition-[stroke-dashoffset] duration-700 ease-out', over ? 'stroke-danger' : strokes[color])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
