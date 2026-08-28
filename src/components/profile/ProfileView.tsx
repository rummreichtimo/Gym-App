'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Camera,
  ChevronRight,
  Flame,
  LogOut,
  Settings,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Avatar } from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/session-provider';
import {
  ACTIVITY_LEVELS,
  EXPERIENCE_LEVELS,
  GENDERS,
  TRAINING_GOALS,
  labelFor,
} from '@/lib/constants';
import { cmToDisplay, displayToCm, kgToDisplay } from '@/lib/units';
import { formatNumber, toDateKey } from '@/lib/utils';
import type { DashboardDto, ProfileDto } from '@/types';

export function ProfileView() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile, setProfile, logout } = useSession();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<{ dashboard: DashboardDto }>('/api/dashboard'),
  });

  const saveAvatar = useMutation({
    mutationFn: (avatarUrl: string) =>
      api.patch<{ profile: ProfileDto }>('/api/profile', { avatarUrl }),
    onSuccess: async (result) => {
      setProfile(result.profile);
      await queryClient.invalidateQueries();
      toast.success('Profilbild aktualisiert');
    },
    onError: (error) => toast.error('Profilbild konnte nicht gespeichert werden', errorMessage(error)),
  });

  async function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      saveAvatar.mutate(await downscaleSquare(file, 320));
    } catch {
      toast.error('Bild konnte nicht gelesen werden');
    }
  }

  if (!profile) return null;

  const stats = dashboard?.dashboard;
  const age = profile.birthDate
    ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / 31_557_600_000)
    : null;

  return (
    <PageShell width="narrow">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={handleAvatar}
        className="hidden"
        aria-hidden
      />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="tap relative shrink-0"
            aria-label="Profilbild ändern"
          >
            <Avatar name={profile.name} src={profile.avatarUrl} size="lg" />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-brand text-brand-fg">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-fg">{profile.name}</h2>
            <p className="truncate text-sm text-muted">{profile.email}</p>
            <p className="mt-1 text-xs text-subtle">
              {labelFor(TRAINING_GOALS, profile.goal)} ·{' '}
              {labelFor(EXPERIENCE_LEVELS, profile.experience)}
            </p>
          </div>
        </div>

        <Button variant="outline" fullWidth className="mt-4" onClick={() => setEditOpen(true)}>
          Profil bearbeiten
        </Button>
      </Card>

      {/* Key figures */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniTile
          icon={<Zap className="h-4 w-4" />}
          label="Workouts"
          value={stats ? String(stats.recentWorkouts.length >= 5 ? '5+' : stats.recentWorkouts.length) : '—'}
        />
        <MiniTile
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={stats ? `${stats.streak.days} T.` : '—'}
        />
        <MiniTile
          icon={<Trophy className="h-4 w-4" />}
          label="Rekorde"
          value={stats ? String(stats.recentPrs.length) : '—'}
        />
      </div>

      {/* Body data */}
      <Card className="mt-4">
        <h3 className="border-b border-border px-4 py-3 font-semibold text-fg">Deine Daten</h3>
        <dl className="divide-y divide-border">
          <Row label="Alter" value={age !== null ? `${age} Jahre` : 'Nicht angegeben'} />
          <Row
            label="Größe"
            value={
              profile.heightCm
                ? `${formatNumber(cmToDisplay(profile.heightCm, profile.lengthUnit), 1)} ${profile.lengthUnit}`
                : 'Nicht angegeben'
            }
          />
          <Row
            label="Startgewicht"
            value={
              profile.startWeightKg
                ? `${formatNumber(kgToDisplay(profile.startWeightKg, profile.weightUnit), 1)} ${profile.weightUnit}`
                : 'Nicht angegeben'
            }
          />
          <Row label="Geschlecht" value={labelFor(GENDERS, profile.gender, 'Keine Angabe')} />
          <Row label="Trainingsziel" value={labelFor(TRAINING_GOALS, profile.goal)} />
          <Row label="Aktivitätslevel" value={labelFor(ACTIVITY_LEVELS, profile.activityLevel)} />
          <Row label="Workouts pro Woche" value={`${profile.weeklyTarget}`} />
        </dl>
      </Card>

      {/* Links */}
      <div className="mt-4 space-y-2">
        <LinkRow href="/goals" icon={<Target className="h-4 w-4" />} label="Ziele verwalten" />
        <LinkRow href="/records" icon={<Trophy className="h-4 w-4" />} label="Persönliche Rekorde" />
        <LinkRow href="/notifications" icon={<Bell className="h-4 w-4" />} label="Benachrichtigungen" />
        <LinkRow href="/settings" icon={<Settings className="h-4 w-4" />} label="Einstellungen" />
      </div>

      <Button
        variant="ghost"
        fullWidth
        className="mt-5 text-danger hover:text-danger"
        onClick={() => void logout()}
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
    </PageShell>
  );
}

function MiniTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-brand">
        {icon}
      </span>
      <p className="mt-2 text-base font-bold text-fg">{value}</p>
      <p className="text-[11px] text-subtle">{label}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="truncate text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

function LinkRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="tap block">
      <Card className="flex items-center gap-3 p-4 transition-colors hover:border-subtle">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-brand">
          {icon}
        </span>
        <span className="flex-1 text-sm font-medium text-fg">{label}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
      </Card>
    </Link>
  );
}

function EditProfileModal({
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
    name: profile.name,
    birthDate: profile.birthDate ?? '',
    gender: profile.gender ?? 'undisclosed',
    height: profile.heightCm
      ? String(Math.round(cmToDisplay(profile.heightCm, profile.lengthUnit) * 10) / 10)
      : '',
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    experience: profile.experience,
    weeklyTarget: String(profile.weeklyTarget),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const save = useMutation({
    mutationFn: () =>
      api.patch<{ profile: ProfileDto }>('/api/profile', {
        name: form.name.trim(),
        birthDate: form.birthDate || null,
        gender: form.gender,
        heightCm: form.height
          ? displayToCm(Number(form.height.replace(',', '.')), profile.lengthUnit)
          : null,
        goal: form.goal,
        activityLevel: form.activityLevel,
        experience: form.experience,
        weeklyTarget: Number(form.weeklyTarget),
      }),
    onSuccess: async (result) => {
      setProfile(result.profile);
      await queryClient.invalidateQueries();
      toast.success('Profil gespeichert');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
        return;
      }
      toast.error('Profil konnte nicht gespeichert werden', errorMessage(error));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profil bearbeiten"
      footer={
        <Button fullWidth size="lg" onClick={() => save.mutate()} loading={save.isPending}>
          Speichern
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={fieldErrors.name?.[0]}
        />
        <Input
          label="Geburtsdatum"
          type="date"
          value={form.birthDate}
          max={toDateKey()}
          onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
        />
        <Select
          label="Geschlecht"
          value={form.gender}
          onChange={(event) => setForm({ ...form, gender: event.target.value })}
        >
          {GENDERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Größe"
          type="number"
          inputMode="decimal"
          step="0.1"
          suffix={profile.lengthUnit}
          value={form.height}
          onChange={(event) => setForm({ ...form, height: event.target.value })}
          error={fieldErrors.heightCm?.[0]}
        />
        <Select
          label="Trainingsziel"
          value={form.goal}
          onChange={(event) => setForm({ ...form, goal: event.target.value })}
        >
          {TRAINING_GOALS.map((goal) => (
            <option key={goal.key} value={goal.key}>
              {goal.label}
            </option>
          ))}
        </Select>
        <Select
          label="Aktivitätslevel"
          value={form.activityLevel}
          onChange={(event) => setForm({ ...form, activityLevel: event.target.value })}
        >
          {ACTIVITY_LEVELS.map((level) => (
            <option key={level.key} value={level.key}>
              {level.label} – {level.description}
            </option>
          ))}
        </Select>
        <Select
          label="Trainingserfahrung"
          value={form.experience}
          onChange={(event) => setForm({ ...form, experience: event.target.value })}
        >
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level.key} value={level.key}>
              {level.label}
            </option>
          ))}
        </Select>
        <Input
          label="Workouts pro Woche"
          type="number"
          inputMode="numeric"
          min={1}
          max={14}
          value={form.weeklyTarget}
          onChange={(event) => setForm({ ...form, weeklyTarget: event.target.value })}
          error={fieldErrors.weeklyTarget?.[0]}
        />
      </div>
    </Modal>
  );
}

/** Center-crops and downscales an avatar so it stays small. */
function downscaleSquare(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('decode failed'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('canvas unavailable'));
          return;
        }
        const side = Math.min(image.width, image.height);
        context.drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
