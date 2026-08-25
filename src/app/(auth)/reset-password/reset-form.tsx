'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api, ApiClientError } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';

export function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmation) {
      setFieldErrors({ confirmation: ['Die Passwörter stimmen nicht überein.'] });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      toast.success('Passwort geändert', 'Du kannst dich jetzt mit dem neuen Passwort anmelden.');
      router.replace('/login');
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

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-bold text-fg">Ungültiger Link</h1>
        <p className="mt-1 text-sm text-muted">
          Dieser Link zum Zurücksetzen ist unvollständig oder abgelaufen.
        </p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button fullWidth size="lg">
            Neuen Link anfordern
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-fg">Neues Passwort festlegen</h1>
      <p className="mt-1 text-sm text-muted">Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error ? (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
        <Input
          label="Neues Passwort"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password?.[0]}
          required
        />
        <Input
          label="Passwort bestätigen"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={fieldErrors.confirmation?.[0]}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Passwort speichern
        </Button>
      </form>
    </Card>
  );
}
