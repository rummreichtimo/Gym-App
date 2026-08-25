'use client';

import { cn } from '@/lib/utils';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** Horizontally scrollable segmented control - never wraps or overflows. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'tap flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all',
            size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
            value === option.value
              ? 'bg-brand text-brand-fg shadow-sm'
              : 'text-muted hover:bg-elevated hover:text-fg',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
