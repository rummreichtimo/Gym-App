'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useSession } from '@/components/session-provider';
import { useToast } from '@/components/ui/Toast';
import { api, ApiClientError } from '@/lib/api-client';
import { calculateMacroTargets } from '@/lib/fitness';
import {
  ACTIVITY_LEVELS,
  APP_NAME,
  EXPERIENCE_LEVELS,
  GENDERS,
  TRAINING_GOALS,
} from '@/lib/constants';
import { displayToCm, displayToKg, cmToDisplay, kgToDisplay } from '@/lib/units';
import { cn, formatNumber } from '@/lib/utils';
import type { ProfileDto } from '@/types';

type WeightUnit = 'kg' | 'lb';
type LengthUnit = 'cm' | 'in';

interface FormState {
  name: string;
  birthDate: string;
  gender: string;
  height: string;
  weight: string;
  goal: string;
  experience: string;
  weeklyTarget: number;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
  activityLevel: string;
  useCustomNutrition: boolean;
  calorieTarget: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
  createStarterPlan: boolean;
}

const STEPS = ['Über dich', 'Körperdaten', 'Dein Ziel', 'Training', 'Ernährung'] as const;

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const toast = useToast();
  const { setProfile } = useSession();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    name: defaultName,
    birthDate: '',
    gender: 'undisclosed',
    height: '',
    weight: '',
    goal: 'muscle_gain',
    experience: 'intermediate',
    weeklyTarget: 4,
    weightUnit: 'kg',
    lengthUnit: 'cm',
    activityLevel: 'moderate',
    useCustomNutrition: false,
    calorieTarget: '',
    proteinTarget: '',
    carbTarget: '',
    fatTarget: '',
    createStarterPlan: true,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  // Live macro preview from the entered body data.
  const suggested = useMemo(() => {
    const heightCm = displayToCm(Number(form.height.replace(',', '.')) || 0, form.lengthUnit);
    const weightKg = displayToKg(Number(form.weight.replace(',', '.')) || 0, form.weightUnit);
    if (heightCm < 80 || weightKg < 20) return null;

    const age = form.birthDate
      ? Math.max(14, Math.floor((Date.now() - new Date(form.birthDate).getTime()) / 31_557_600_000))
      : 30;

    return calculateMacroTargets({
      weightKg,
      heightCm,
      age,
      gender: form.gender,
      activityLevel: form.activityLevel,
      goal: form.goal,
    });
  }, [form.height, form.weight, form.lengthUnit, form.weightUnit, form.birthDate, form.gender, form.activityLevel, form.goal]);

  function validateStep(index: number): boolean {
    const next: Record<string, string> = {};

    if (index === 0 && form.name.trim().length < 2) {
      next.name = 'Bitte gib deinen Namen ein.';
    }

    if (index === 1) {
      const height = Number(form.height.replace(',', '.'));
      const weight = Number(form.weight.replace(',', '.'));
      const heightCm = displayToCm(height, form.lengthUnit);
      const weightKg = displayToKg(weight, form.weightUnit);

      if (!height || heightCm < 80 || heightCm > 260) {
        next.height = 'Bitte gib eine gültige Größe ein.';
      }
      if (!weight || weightKg < 20 || weightKg > 400) {
        next.weight = 'Bitte gib ein gültiges Gewicht ein.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    void submit();
  }

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        birthDate: form.birthDate || null,
        gender: form.gender,
        heightCm: displayToCm(Number(form.height.replace(',', '.')), form.lengthUnit),
        weightKg: displayToKg(Number(form.weight.replace(',', '.')), form.weightUnit),
        goal: form.goal,
        experience: form.experience,
        weeklyTarget: form.weeklyTarget,
        weightUnit: form.weightUnit,
        lengthUnit: form.lengthUnit,
        activityLevel: form.activityLevel,
        createStarterPlan: form.createStarterPlan,
        ...(form.useCustomNutrition
          ? {
              calorieTarget: Number(form.calorieTarget) || suggested?.calories,
              proteinTarget: Number(form.proteinTarget) || suggested?.protein,
              carbTarget: Number(form.carbTarget) || suggested?.carbs,
              fatTarget: Number(form.fatTarget) || suggested?.fat,
            }
          : {}),
      };

      const data = await api.post<{ profile: ProfileDto }>('/api/profile/onboarding', payload);
      setProfile(data.profile);
      toast.success('Alles bereit!', 'Dein Dashboard ist eingerichtet.');
      router.replace('/dashboard');
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : 'Die Einrichtung konnte nicht gespeichert werden. Bitte versuche es erneut.';
      toast.error('Fehler', message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-bold tracking-tight text-fg">Willkommen bei {APP_NAME}</p>
            <p className="text-sm text-muted">
              Schritt {step + 1} von {STEPS.length} · {STEPS[step]}
            </p>
          </div>
        </div>

        <div className="mb-8 flex gap-1.5" aria-hidden>
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index <= step ? 'bg-brand' : 'bg-elevated',
              )}
            />
          ))}
        </div>

        <div className="min-h-[22rem] animate-fade-up" key={step}>
          {step === 0 ? (
            <StepAbout form={form} update={update} errors={errors} />
          ) : step === 1 ? (
            <StepBody form={form} update={update} errors={errors} />
          ) : step === 2 ? (
            <StepGoal form={form} update={update} />
          ) : step === 3 ? (
            <StepTraining form={form} update={update} />
          ) : (
            <StepNutrition form={form} update={update} suggested={suggested} />
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 ? (
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Button>
          ) : null}
          <Button size="lg" fullWidth onClick={goNext} loading={loading}>
            {step === STEPS.length - 1 ? (
              <>
                <Check className="h-4 w-4" />
                Einrichtung abschließen
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Steps -----------------------------------------------------------------

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  errors?: Record<string, string>;
}

function StepAbout({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">Wie sollen wir dich nennen?</h2>
        <p className="mt-1 text-sm text-muted">Dein Name erscheint auf deinem Dashboard.</p>
      </div>
      <Input
        label="Name"
        value={form.name}
        onChange={(event) => update('name', event.target.value)}
        error={errors?.name}
        placeholder="Alex"
        autoFocus
      />
      <Input
        label="Geburtsdatum (optional)"
        type="date"
        value={form.birthDate}
        onChange={(event) => update('birthDate', event.target.value)}
        hint="Hilft bei der Berechnung deines Kalorienbedarfs."
      />
      <Select
        label="Geschlecht"
        value={form.gender}
        onChange={(event) => update('gender', event.target.value)}
        hint="Fließt in die Berechnung deines Grundumsatzes ein."
      >
        {GENDERS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function StepBody({ form, update, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">Deine Körperdaten</h2>
        <p className="mt-1 text-sm text-muted">
          Startwerte für deinen Verlauf – du kannst sie jederzeit ändern.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <UnitToggle
          label="Gewicht"
          options={['kg', 'lb']}
          value={form.weightUnit}
          onChange={(unit) => {
            // Convert the entered number so the value stays the same weight.
            const current = Number(form.weight.replace(',', '.'));
            if (current > 0) {
              const kg = displayToKg(current, form.weightUnit);
              update('weight', String(Math.round(kgToDisplay(kg, unit as WeightUnit) * 10) / 10));
            }
            update('weightUnit', unit as WeightUnit);
          }}
        />
        <UnitToggle
          label="Länge"
          options={['cm', 'in']}
          value={form.lengthUnit}
          onChange={(unit) => {
            const current = Number(form.height.replace(',', '.'));
            if (current > 0) {
              const cm = displayToCm(current, form.lengthUnit);
              update('height', String(Math.round(cmToDisplay(cm, unit as LengthUnit) * 10) / 10));
            }
            update('lengthUnit', unit as LengthUnit);
          }}
        />
      </div>

      <Input
        label="Größe"
        type="number"
        inputMode="decimal"
        step="0.1"
        suffix={form.lengthUnit}
        value={form.height}
        onChange={(event) => update('height', event.target.value)}
        error={errors?.height}
        placeholder={form.lengthUnit === 'cm' ? '180' : '71'}
      />
      <Input
        label="Aktuelles Gewicht"
        type="number"
        inputMode="decimal"
        step="0.1"
        suffix={form.weightUnit}
        value={form.weight}
        onChange={(event) => update('weight', event.target.value)}
        error={errors?.weight}
        placeholder={form.weightUnit === 'kg' ? '80' : '176'}
      />
      <Select
        label="Wie aktiv bist du außerhalb des Trainings?"
        value={form.activityLevel}
        onChange={(event) => update('activityLevel', event.target.value)}
      >
        {ACTIVITY_LEVELS.map((level) => (
          <option key={level.key} value={level.key}>
            {level.label} – {level.description}
          </option>
        ))}
      </Select>
    </div>
  );
}

function StepGoal({ form, update }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">Was ist dein Ziel?</h2>
        <p className="mt-1 text-sm text-muted">Damit stimmen wir deine Kalorien und Makros ab.</p>
      </div>
      <div className="space-y-2.5">
        {TRAINING_GOALS.map((goal) => (
          <OptionCard
            key={goal.key}
            selected={form.goal === goal.key}
            title={goal.label}
            description={goal.description}
            onClick={() => update('goal', goal.key)}
          />
        ))}
      </div>
    </div>
  );
}

function StepTraining({ form, update }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">Dein Trainingsalltag</h2>
        <p className="mt-1 text-sm text-muted">
          Wir erstellen dir daraus einen passenden Startplan.
        </p>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-medium text-muted">Deine Trainingserfahrung</p>
        <div className="space-y-2.5">
          {EXPERIENCE_LEVELS.map((level) => (
            <OptionCard
              key={level.key}
              selected={form.experience === level.key}
              title={level.label}
              description={level.description}
              onClick={() => update('experience', level.key)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-medium text-muted">Workouts pro Woche</p>
        <div className="grid grid-cols-6 gap-2">
          {[2, 3, 4, 5, 6, 7].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => update('weeklyTarget', count)}
              className={cn(
                'tap flex h-12 items-center justify-center rounded-xl border font-bold transition-all',
                form.weeklyTarget === count
                  ? 'border-brand bg-brand text-brand-fg'
                  : 'border-border bg-surface-2 text-muted hover:border-subtle',
              )}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-4">
        <input
          type="checkbox"
          checked={form.createStarterPlan}
          onChange={(event) => update('createStarterPlan', event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">Startplan erstellen</span>
          <span className="mt-0.5 block text-sm text-muted">
            Wir legen einen fertigen Trainingsplan an, der zu deiner Frequenz passt. Du kannst ihn
            jederzeit anpassen.
          </span>
        </span>
      </label>
    </div>
  );
}

function StepNutrition({
  form,
  update,
  suggested,
}: StepProps & { suggested: ReturnType<typeof calculateMacroTargets> | null }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg">Deine Ernährungsziele</h2>
        <p className="mt-1 text-sm text-muted">
          Vorschläge auf Basis deiner Angaben – allgemeine Richtwerte, keine medizinische Beratung.
        </p>
      </div>

      {suggested ? (
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Kalorien" value={`${formatNumber(suggested.calories)}`} unit="kcal" />
            <Stat label="Protein" value={String(suggested.protein)} unit="g" />
            <Stat label="Kohlenhydrate" value={String(suggested.carbs)} unit="g" />
            <Stat label="Fett" value={String(suggested.fat)} unit="g" />
          </div>
          <p className="mt-3 text-xs text-subtle">
            Grundumsatz ca. {formatNumber(suggested.bmr)} kcal · Gesamtumsatz ca.{' '}
            {formatNumber(suggested.tdee)} kcal
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          Ergänze Größe und Gewicht, um einen Vorschlag zu erhalten. Du kannst deine Ziele auch
          später in den Einstellungen festlegen.
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-4">
        <input
          type="checkbox"
          checked={form.useCustomNutrition}
          onChange={(event) => {
            update('useCustomNutrition', event.target.checked);
            if (event.target.checked && suggested) {
              update('calorieTarget', String(suggested.calories));
              update('proteinTarget', String(suggested.protein));
              update('carbTarget', String(suggested.carbs));
              update('fatTarget', String(suggested.fat));
            }
          }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">Eigene Werte festlegen</span>
          <span className="mt-0.5 block text-sm text-muted">
            Du weißt genau, was du brauchst? Trage deine Ziele selbst ein.
          </span>
        </span>
      </label>

      {form.useCustomNutrition ? (
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kalorien"
            type="number"
            inputMode="numeric"
            suffix="kcal"
            value={form.calorieTarget}
            onChange={(event) => update('calorieTarget', event.target.value)}
          />
          <Input
            label="Protein"
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.proteinTarget}
            onChange={(event) => update('proteinTarget', event.target.value)}
          />
          <Input
            label="Kohlenhydrate"
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.carbTarget}
            onChange={(event) => update('carbTarget', event.target.value)}
          />
          <Input
            label="Fett"
            type="number"
            inputMode="numeric"
            suffix="g"
            value={form.fatTarget}
            onChange={(event) => update('fatTarget', event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function OptionCard({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'tap flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-brand bg-brand/10'
          : 'border-border bg-surface-2 hover:border-subtle',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-brand bg-brand' : 'border-subtle',
        )}
      >
        {selected ? <Check className="h-3 w-3 text-brand-fg" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
    </button>
  );
}

function UnitToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted">{label}</p>
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'tap h-9 flex-1 rounded-lg text-sm font-semibold transition-all',
              value === option ? 'bg-brand text-brand-fg' : 'text-muted hover:text-fg',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-fg">
        {value}
        <span className="ml-1 text-xs font-medium text-muted">{unit}</span>
      </p>
    </div>
  );
}
