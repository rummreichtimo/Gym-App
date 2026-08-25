'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useSession } from '@/components/session-provider';
import { api, ApiClientError } from '@/lib/api-client';
import type { ProfileDto } from '@/types';

export function LoginForm() {
  const router = useRouter();
  const { setProfile } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const data = await api.post<{ profile: ProfileDto }>('/api/auth/login', { email, password });
      setProfile(data.profile);
      router.replace(data.profile.onboardingCompleted ? '/dashboard' : '/onboarding');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setError(caught.message);
        setFieldErrors(caught.details ?? {});
      } else {
        setError('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
      }
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-fg">Willkommen zurück</h1>
      <p className="mt-1 text-sm text-muted">Melde dich an, um dein Training fortzusetzen.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Input
          label="E-Mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email?.[0]}
          placeholder="du@beispiel.de"
          required
        />
        <Input
          label="Passwort"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password?.[0]}
          placeholder="••••••••"
          required
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Passwort vergessen?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Anmelden
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Noch kein Konto?{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Jetzt registrieren
        </Link>
      </p>
    </Card>
  );
}
