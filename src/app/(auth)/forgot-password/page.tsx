'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api, errorMessage } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetUrl?: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ message: string; resetUrl?: string }>(
        '/api/auth/forgot-password',
        { email },
      );
      setResult(data);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold text-fg">Passwort zurücksetzen</h1>
      <p className="mt-1 text-sm text-muted">
        Gib deine E-Mail-Adresse ein und wir erstellen dir einen Link zum Zurücksetzen.
      </p>

      {result ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-fg">
            {result.message}
          </div>
          {result.resetUrl ? (
            <>
              <p className="text-sm text-muted">
                In dieser Installation ist kein E-Mail-Versand konfiguriert. Nutze den Link direkt:
              </p>
              <Link href={result.resetUrl}>
                <Button fullWidth size="lg">
                  Neues Passwort festlegen
                </Button>
              </Link>
            </>
          ) : null}
          <Link href="/login" className="block text-center text-sm font-medium text-brand hover:underline">
            Zurück zur Anmeldung
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error ? (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          <Input
            label="E-Mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="du@beispiel.de"
            required
          />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Link erstellen
          </Button>
          <Link href="/login" className="block text-center text-sm font-medium text-brand hover:underline">
            Zurück zur Anmeldung
          </Link>
        </form>
      )}
    </Card>
  );
}
