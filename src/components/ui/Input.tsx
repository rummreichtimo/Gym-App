'use client';

import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
>(function Input({ label, hint, error, suffix, className, id, type, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  // Every password field gets a reveal toggle, so a typo can be spotted
  // instead of guessed at.
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? 'text' : type;

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
          type={effectiveType}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-fg placeholder:text-subtle',
            'transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
            'disabled:opacity-60',
            suffix && 'pr-14',
            isPassword && 'pr-11',
            error ? 'border-danger' : 'border-border',
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            // Not focusable by keyboard: tabbing through a form should go
            // straight to the next field, not via the toggle.
            tabIndex={-1}
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Passwort verbergen' : 'Passwort anzeigen'}
            aria-pressed={revealed}
            className="tap absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-subtle transition-colors hover:text-fg"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
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

/** Inline chevron so the select keeps the themed background colour. */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239aa3b5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

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
          'h-11 w-full appearance-none rounded-xl border bg-surface-2 px-3.5 pr-10 text-fg',
          'transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
          error ? 'border-danger' : 'border-border',
        )}
        // The chevron lives in `style` rather than in Tailwind's arbitrary
        // background utilities: tailwind-merge treats those as conflicting with
        // `bg-surface-2` and would drop the background colour.
        style={{
          backgroundImage: CHEVRON,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.85rem center',
          backgroundSize: '18px',
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
