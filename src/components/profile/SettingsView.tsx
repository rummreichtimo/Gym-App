'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Download, Lock, Moon, Ruler, Target, Trash2, Volume2 } from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import { RemindersSection } from './RemindersSection';
import { calculateMacroTargets } from '@/lib/fitness';
import { formatNumber } from '@/lib/utils';
import type { ProfileDto } from '@/types';

export function SettingsView() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useSession();

  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const update = useMutation({
    mutationFn: (values: Partial<ProfileDto>) =>
      api.patch<{ profile: ProfileDto }>('/api/profile', values),
    onSuccess: async (result) => {
      setProfile(result.profile);
      await queryClient.invalidateQueries();
    },
    onError: (error) => toast.error('Einstellung konnte nicht gespeichert werden', errorMessage(error)),
  });

  /** Streams the export straight to a download without buffering in state. */
  async function exportData(format: 'json' | 'csv') {
    try {
      const response = await fetch(`/api/profile/export?format=${format}`);
      if (!response.ok) throw new Error('export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ironpath-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Export erstellt', 'Der Download wurde gestartet.');
    } catch {
      toast.error('Export fehlgeschlagen', 'Bitte versuche es erneut.');
    }
  }

  if (!profile) return null;

  return (
    <PageShell width="narrow">
      {/* Units */}
      <Card>
        <CardHeader title="Einheiten" icon={<Ruler className="h-4 w-4" />} />
        <div className="space-y-4 p-4 sm:p-5">
          <Select
            label="Gewicht"
            value={profile.weightUnit}
            onChange={(event) => update.mutate({ weightUnit: event.target.value as 'kg' | 'lb' })}
          >
            <option value="kg">Kilogramm (kg)</option>
            <option value="lb">Pfund (lb)</option>
          </Select>
          <Select
            label="Länge"
            value={profile.lengthUnit}
            onChange={(event) => update.mutate({ lengthUnit: event.target.value as 'cm' | 'in' })}
          >
            <option value="cm">Zentimeter (cm)</option>
            <option value="in">Zoll (in)</option>
          </Select>
          <p className="text-xs text-subtle">
            Alle Werte werden intern metrisch gespeichert und nur für die Anzeige umgerechnet – ein
            Wechsel verändert deine Daten nicht.
          </p>
        </div>
      </Card>

      {/* Nutrition targets */}
      <Card className="mt-4">
        <CardHeader
          title="Ernährungsziele"
          subtitle="Deine Tagesziele für Kalorien und Makros"
          icon={<Target className="h-4 w-4" />}
          action={
            <Button size="sm" variant="outline" onClick={() => setNutritionOpen(true)}>
              Anpassen
            </Button>
          }
        />
        <dl className="divide-y divide-border">
          <Row label="Kalorien" value={`${formatNumber(profile.calorieTarget)} kcal`} />
          <Row label="Protein" value={`${profile.proteinTarget} g`} />
          <Row label="Kohlenhydrate" value={`${profile.carbTarget} g`} />
          <Row label="Fett" value={`${profile.fatTarget} g`} />
        </dl>
      </Card>

      {/* Appearance & workout */}
      <Card className="mt-4">
        <CardHeader title="Darstellung & Training" icon={<Moon className="h-4 w-4" />} />
        <div className="space-y-4 p-4 sm:p-5">
          <Select
            label="Design"
            value={profile.theme}
            onChange={(event) =>
              update.mutate({ theme: event.target.value as 'dark' | 'light' | 'system' })
            }
          >
            <option value="dark">Dunkel</option>
            <option value="light">Hell</option>
            <option value="system">Systemeinstellung</option>
          </Select>

          <Select
            label="Sprache"
            value={profile.language}
            onChange={(event) => update.mutate({ language: event.target.value as 'de' | 'en' })}
          >
            <option value="de">Deutsch</option>
            <option value="en">English (Zahlen- und Datumsformate)</option>
          </Select>

          <Input
            label="Standard-Pausenzeit"
            type="number"
            inputMode="numeric"
            suffix="Sek."
            defaultValue={String(profile.defaultRestSec)}
            onBlur={(event) => {
              const value = Number(event.target.value);
              if (value >= 10 && value <= 900 && value !== profile.defaultRestSec) {
                update.mutate({ defaultRestSec: value });
              }
            }}
            hint="Wird verwendet, wenn eine Übung keine eigene Pausenzeit hat."
          />

          <div className="border-t border-border pt-4">
            <Switch
              checked={profile.soundEnabled}
              onChange={(checked) => update.mutate({ soundEnabled: checked })}
              label="Ton am Ende der Pause"
              description="Spielt einen kurzen Signalton, wenn der Pausentimer abläuft."
            />
          </div>
          <Switch
            checked={profile.notificationsOn}
            onChange={(checked) => update.mutate({ notificationsOn: checked })}
            label="Benachrichtigungen"
            description="Rekorde, Streaks, Ziele und Erinnerungen in deinem Posteingang."
          />
        </div>
      </Card>

      <div className="mt-4">
        <RemindersSection />
      </div>

      {/* Data */}
      <Card className="mt-4">
        <CardHeader
          title="Deine Daten"
          subtitle="Export und Datenschutz"
          icon={<Download className="h-4 w-4" />}
        />
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-sm text-muted">
            Deine Daten gehören dir. Exportiere jederzeit deine komplette Trainings- und
            Ernährungshistorie.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" fullWidth onClick={() => void exportData('json')}>
              <Download className="h-4 w-4" />
              Alles als JSON
            </Button>
            <Button variant="outline" fullWidth onClick={() => void exportData('csv')}>
              <Download className="h-4 w-4" />
              Training als CSV
            </Button>
          </div>
          <p className="text-xs text-subtle">
            IronPath speichert deine Daten ausschließlich in deiner eigenen Datenbank. Jeder Zugriff
            ist auf dein Konto beschränkt – niemand sonst kann deine Einträge sehen.
          </p>
        </div>
      </Card>

      {/* Security */}
      <Card className="mt-4">
        <CardHeader title="Sicherheit" icon={<Lock className="h-4 w-4" />} />
        <div className="space-y-2 p-4 sm:p-5">
          <Button variant="outline" fullWidth onClick={() => setPasswordOpen(true)}>
            Passwort ändern
          </Button>
          <Button
            variant="ghost"
            fullWidth
            className="text-danger hover:text-danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Konto löschen
          </Button>
        </div>
      </Card>

      <NutritionTargetsModal
        open={nutritionOpen}
        onClose={() => setNutritionOpen(false)}
        profile={profile}
      />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setProfile(null);
          queryClient.clear();
          router.replace('/register');
        }}
      />
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function NutritionTargetsModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileDto;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setProfile } = useSession();

  const [form, setForm] = useState({
    calorieTarget: String(profile.calorieTarget),
    proteinTarget: String(profile.proteinTarget),
    carbTarget: String(profile.carbTarget),
    fatTarget: String(profile.fatTarget),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: () =>
      api.patch<{ profile: ProfileDto }>('/api/profile', {
        calorieTarget: Number(form.calorieTarget),
        proteinTarget: Number(form.proteinTarget),
        carbTarget: Number(form.carbTarget),
        fatTarget: Number(form.fatTarget),
      }),
    onSuccess: async (result) => {
      setProfile(result.profile);
      await queryClient.invalidateQueries();
      toast.success('Ernährungsziele gespeichert');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Speichern fehlgeschlagen', errorMessage(error));
    },
  });

  /** Recomputes a recommendation from the profile's body data. */
  function recalculate() {
    if (!profile.heightCm || !profile.startWeightKg) {
      toast.info(
        'Körperdaten fehlen',
        'Ergänze Größe und Gewicht in deinem Profil, um einen Vorschlag zu berechnen.',
      );
      return;
    }
    const age = profile.birthDate
      ? Math.max(14, Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / 31_557_600_000))
      : 30;
    const targets = calculateMacroTargets({
      weightKg: profile.startWeightKg,
      heightCm: profile.heightCm,
      age,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
    });
    setForm({
      calorieTarget: String(targets.calories),
      proteinTarget: String(targets.protein),
      carbTarget: String(targets.carbs),
      fatTarget: String(targets.fat),
    });
    toast.info('Vorschlag übernommen', 'Prüfe die Werte und speichere sie.');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ernährungsziele"
      description="Allgemeine Richtwerte – keine medizinische oder diätetische Beratung."
      footer={
        <Button fullWidth size="lg" onClick={() => save.mutate()} loading={save.isPending}>
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Button variant="outline" fullWidth onClick={recalculate}>
          Vorschlag aus meinen Daten berechnen
        </Button>
        <Input
          label="Kalorien"
          type="number"
          inputMode="numeric"
          suffix="kcal"
          value={form.calorieTarget}
          onChange={(event) => setForm({ ...form, calorieTarget: event.target.value })}
          error={fieldErrors.calorieTarget?.[0]}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Protein"
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.proteinTarget}
            onChange={(event) => setForm({ ...form, proteinTarget: event.target.value })}
            error={fieldErrors.proteinTarget?.[0]}
          />
          <Input
            label="Kohlenh."
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.carbTarget}
            onChange={(event) => setForm({ ...form, carbTarget: event.target.value })}
            error={fieldErrors.carbTarget?.[0]}
          />
          <Input
            label="Fett"
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.fatTarget}
            onChange={(event) => setForm({ ...form, fatTarget: event.target.value })}
            error={fieldErrors.fatTarget?.[0]}
          />
        </div>
      </div>
    </Modal>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: () =>
      api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    onSuccess: () => {
      toast.success('Passwort geändert');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Passwort konnte nicht geändert werden', errorMessage(error));
    },
  });

  function submit() {
    setFieldErrors({});
    if (form.newPassword !== form.confirm) {
      setFieldErrors({ confirm: ['Die Passwörter stimmen nicht überein.'] });
      return;
    }
    save.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Passwort ändern"
      size="sm"
      footer={
        <Button fullWidth size="lg" onClick={submit} loading={save.isPending}>
          Passwort speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Aktuelles Passwort"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
          error={fieldErrors.currentPassword?.[0]}
        />
        <Input
          label="Neues Passwort"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
          error={fieldErrors.newPassword?.[0]}
          hint="Mindestens 8 Zeichen."
        />
        <Input
          label="Neues Passwort bestätigen"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(event) => setForm({ ...form, confirm: event.target.value })}
          error={fieldErrors.confirm?.[0]}
        />
      </div>
    </Modal>
  );
}

function DeleteAccountModal({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const remove = useMutation({
    mutationFn: () => api.post('/api/profile/delete', { password, confirm }),
    onSuccess: () => {
      toast.info('Konto gelöscht', 'Alle deine Daten wurden entfernt.');
      onDeleted();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Konto konnte nicht gelöscht werden', errorMessage(error));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Konto löschen"
      description="Diese Aktion kann nicht rückgängig gemacht werden."
      size="sm"
      footer={
        <Button
          variant="danger"
          fullWidth
          size="lg"
          onClick={() => remove.mutate()}
          loading={remove.isPending}
          disabled={confirm !== 'LÖSCHEN' || password.length === 0}
        >
          Konto endgültig löschen
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-fg">
          Alle Workouts, Pläne, Ernährungseinträge, Körperdaten und Rekorde werden dauerhaft
          gelöscht. Exportiere deine Daten vorher, falls du sie behalten möchtest.
        </div>
        <Input
          label="Passwort"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password?.[0]}
        />
        <Input
          label="Tippe LÖSCHEN zur Bestätigung"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={fieldErrors.confirm?.[0]}
          placeholder="LÖSCHEN"
        />
      </div>
    </Modal>
  );
}
