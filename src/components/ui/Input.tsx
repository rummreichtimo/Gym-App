'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  suffix?: React.ReactNode;
  className?: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, hint, error, suffix, className, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-fg placeholder:text-subtle',
            'transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
            'disabled:opacity-60',
            suffix && 'pr-14',
            error ? 'border-danger' : 'border-border',
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-subtle">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, hint, error, className, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={props.rows ?? 3}
        className={cn(
          'w-full resize-y rounded-xl border bg-surface-2 px-3.5 py-2.5 text-fg placeholder:text-subtle',
          'transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
          error ? 'border-danger' : 'border-border',
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : hint ? (
        <p className="mt-1.5 text-sm text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function Select({ label, hint, error, className, id, children, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border bg-surface-2 bg-[length:18px] bg-[right_0.85rem_center] bg-no-repeat px-3.5 pr-10 text-fg',
          'transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
          error ? 'border-danger' : 'border-border',
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa3b5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : hint ? (
        <p className="mt-1.5 text-sm text-subtle">{hint}</p>
      ) : null}
    </div>
  );
});
