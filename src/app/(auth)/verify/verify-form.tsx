'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/components/session-provider';
import { useToast } from '@/components/ui/Toast';
import { api, ApiClientError } from '@/lib/api-client';
import type { ProfileDto } from '@/types';

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyForm() {
  const router = useRouter();
  const toast = useToast();
  const { setProfile } = useSession();
  const email = useSearchParams().get('email') ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittedRef = useRef(false);

  // Countdown for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(value: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<{ profile: ProfileDto }>('/api/auth/verify', {
        email,
        code: value,
      });
      setProfile(data.profile);
      toast.success('E-Mail bestätigt', 'Willkommen bei IronPath!');
      router.replace(data.profile.onboardingCompleted ? '/dashboard' : '/onboarding');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? (caught.fieldError('code') ?? caught.message)
          : 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      );
      setCode('');
      setLoading(false);
      submittedRef.current = false;
    }
  }

  function onCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    // Submit as soon as six digits are in - no extra tap needed.
    if (digits.length === 6) void submit(digits);
  }

  async function resend() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setError(null);
    try {
      await api.post('/api/auth/resend-code', { email });
      toast.success('Neuer Code verschickt', 'Schau in dein Postfach.');
    } catch {
      toast.error('Code konnte nicht verschickt werden', 'Bitte versuche es später erneut.');
    }
  }

  if (!email) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-bold text-fg">Link unvollständig</h1>
        <p className="mt-1 text-sm text-muted">
          Wir wissen nicht, welche Adresse bestätigt werden soll. Melde dich erneut an, um einen
          neuen Code zu erhalten.
        </p>
        <Link href="/login" className="mt-6 block">
          <Button fullWidth size="lg">
            Zur Anmeldung
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/12 text-brand">
        <MailCheck className="h-7 w-7" />
      </span>

      <h1 className="text-center text-xl font-bold text-fg">Bestätige deine E-Mail</h1>
      <p className="mt-1.5 text-center text-sm text-muted">
        Wir haben einen sechsstelligen Code an <span className="font-medium text-fg">{email}</span>{' '}
        geschickt.
      </p>

      <div className="mt-6">
        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        ) : null}

        <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-muted">
          Bestätigungscode
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          disabled={loading}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="000000"
          aria-invalid={error ? true : undefined}
          className={`h-16 w-full rounded-xl border bg-surface-2 text-center font-mono text-3xl font-bold tracking-[0.4em] text-fg placeholder:text-subtle/40 focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 ${
            error ? 'border-danger' : 'border-border focus:border-brand'
          }`}
        />
        <p className="mt-2 text-center text-xs text-subtle">
          Der Code ist 30 Minuten gültig.
        </p>
      </div>

      <Button
        size="lg"
        fullWidth
        className="mt-5"
        loading={loading}
        disabled={code.length !== 6}
        onClick={() => void submit(code)}
      >
        Bestätigen
      </Button>

      <div className="mt-6 space-y-2 text-center text-sm">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="tap font-semibold text-brand transition-colors hover:underline disabled:text-subtle disabled:no-underline"
        >
          {cooldown > 0 ? `Neuen Code senden (${cooldown}s)` : 'Keine E-Mail erhalten? Neuen Code senden'}
        </button>
        <p className="text-subtle">
          Schau auch im Spam-Ordner nach.{' '}
          <Link href="/login" className="font-medium text-muted hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </Card>
  );
}
