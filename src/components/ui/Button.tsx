'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand/90 active:bg-brand/80 shadow-sm',
  secondary: 'bg-elevated text-fg hover:bg-elevated/70 active:bg-elevated/60',
  ghost: 'bg-transparent text-muted hover:bg-elevated hover:text-fg',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
  success: 'bg-success text-white hover:bg-success/90',
  outline: 'border border-border bg-transparent text-fg hover:bg-elevated',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2 min-h-[3.25rem]',
  icon: 'h-10 w-10 shrink-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'tap inline-flex items-center justify-center rounded-xl font-semibold transition-all',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
