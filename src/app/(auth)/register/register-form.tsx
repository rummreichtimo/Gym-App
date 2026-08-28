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

export function RegisterForm() {
  const router = useRouter();
  const { setProfile } = useSession();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    // Caught here rather than on the server: the confirmation only guards
    // against a typo, it is not part of the account.
    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: ['Die Passwörter stimmen nicht überein.'] });
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{
        verificationRequired: boolean;
        profile?: ProfileDto;
        email?: string;
      }>('/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // With email verification switched on there is no session yet - the
      // address has to be confirmed with the code we just sent.
      if (data.verificationRequired) {
        router.replace(`/verify?email=${encodeURIComponent(data.email ?? form.email)}&sent=1`);
        return;
      }

      if (data.profile) setProfile(data.profile);
      router.replace('/onboarding');
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
      <h1 className="text-xl font-bold text-fg">Konto erstellen</h1>
      <p className="mt-1 text-sm text-muted">
        Starte in weniger als einer Minute mit deinem Training.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Input
          label="Name"
          autoComplete="name"
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          error={fieldErrors.name?.[0]}
          placeholder="Alex"
          required
        />
        <Input
          label="E-Mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          error={fieldErrors.email?.[0]}
          placeholder="du@beispiel.de"
          required
        />
        <Input
          label="Passwort"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          error={fieldErrors.password?.[0]}
          hint="Mindestens 8 Zeichen."
          placeholder="••••••••"
          required
        />
        <Input
          label="Passwort wiederholen"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => update('confirm', event.target.value)}
          error={fieldErrors.confirm?.[0]}
          placeholder="••••••••"
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Konto erstellen
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Du hast bereits ein Konto?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Anmelden
        </Link>
      </p>
    </Card>
  );
}
