import { z } from 'zod';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const dateKeySchema = z.string().regex(DATE_KEY, 'Ungültiges Datum.');
export const idSchema = z.string().min(1, 'Ungültige ID.');

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
  .email('Bitte gib eine gültige E-Mail-Adresse ein.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.')
  .max(128, 'Das Passwort darf höchstens 128 Zeichen lang sein.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib deinen Namen ein.').max(60, 'Der Name ist zu lang.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Bitte gib den sechsstelligen Code aus der E-Mail ein.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Der Link ist ungültig.'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Bitte gib dein aktuelles Passwort ein.'),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib deinen Namen ein.').max(60).optional(),
  avatarUrl: z.string().max(3_000_000).nullish(),
  birthDate: z.string().nullish(),
  heightCm: z.number().min(80, 'Bitte gib eine gültige Größe ein.').max(260, 'Bitte gib eine gültige Größe ein.').nullish(),
  startWeightKg: z.number().min(20, 'Bitte gib ein gültiges Gewicht ein.').max(400).nullish(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).nullish(),
  goal: z.enum(['muscle_gain', 'fat_loss', 'maintain', 'strength', 'fitness']).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  experience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  weeklyTarget: z.number().int().min(1, 'Mindestens 1 Workout pro Woche.').max(14).optional(),
  weightUnit: z.enum(['kg', 'lb']).optional(),
  lengthUnit: z.enum(['cm', 'in']).optional(),
  language: z.enum(['de', 'en']).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  calorieTarget: z.number().int().min(800, 'Das Kalorienziel ist zu niedrig.').max(8000).optional(),
  proteinTarget: z.number().int().min(0).max(600).optional(),
  carbTarget: z.number().int().min(0).max(1200).optional(),
  fatTarget: z.number().int().min(0).max(500).optional(),
  defaultRestSec: z.number().int().min(10).max(900).optional(),
  soundEnabled: z.boolean().optional(),
  notificationsOn: z.boolean().optional(),
  activePlanId: z.string().nullish(),
  onboardingCompleted: z.boolean().optional(),
});

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib deinen Namen ein.').max(60),
  birthDate: z.string().nullish(),
  heightCm: z.number().min(80).max(260),
  weightKg: z.number().min(20).max(400),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']),
  goal: z.enum(['muscle_gain', 'fat_loss', 'maintain', 'strength', 'fitness']),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyTarget: z.number().int().min(1).max(14),
  weightUnit: z.enum(['kg', 'lb']),
  lengthUnit: z.enum(['cm', 'in']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  calorieTarget: z.number().int().min(800).max(8000).optional(),
  proteinTarget: z.number().int().min(0).max(600).optional(),
  carbTarget: z.number().int().min(0).max(1200).optional(),
  fatTarget: z.number().int().min(0).max(500).optional(),
  createStarterPlan: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Übungsnamen ein.').max(80),
  muscleGroup: z.string().min(1, 'Bitte wähle eine Muskelgruppe.'),
  secondaryMuscles: z.array(z.string()).default([]),
  equipment: z.string().min(1, 'Bitte wähle ein Equipment.'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  description: z.string().max(1000).default(''),
  instructions: z.string().max(3000).default(''),
});

export const exerciseQuerySchema = z.object({
  search: z.string().optional(),
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  difficulty: z.string().optional(),
  custom: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const planSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Plannamen ein.').max(80),
  description: z.string().max(500).default(''),
});

export const planDaySchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen für den Trainingstag ein.').max(60),
  notes: z.string().max(500).optional(),
  weekday: z.number().int().min(0).max(6).nullish(),
  order: z.number().int().min(0).optional(),
});

export const planExerciseSchema = z.object({
  exerciseId: idSchema,
  targetSets: z.number().int().min(1, 'Mindestens 1 Satz.').max(20).default(3),
  repMin: z.number().int().min(1).max(100).default(8),
  repMax: z.number().int().min(1).max(100).default(12),
  targetWeight: z.number().min(0).max(1000).nullish(),
  restSec: z.number().int().min(0).max(900).default(120),
  notes: z.string().max(300).default(''),
}).refine((data) => data.repMax >= data.repMin, {
  message: 'Der maximale Wiederholungsbereich muss größer oder gleich dem minimalen sein.',
  path: ['repMax'],
});

export const planExerciseUpdateSchema = z.object({
  targetSets: z.number().int().min(1).max(20).optional(),
  repMin: z.number().int().min(1).max(100).optional(),
  repMax: z.number().int().min(1).max(100).optional(),
  targetWeight: z.number().min(0).max(1000).nullish(),
  restSec: z.number().int().min(0).max(900).optional(),
  notes: z.string().max(300).optional(),
});

export const reorderSchema = z.object({
  ids: z.array(idSchema).min(1, 'Es wurde nichts zum Sortieren übergeben.'),
});

// ---------------------------------------------------------------------------
// Workout sessions
// ---------------------------------------------------------------------------

export const startWorkoutSchema = z.object({
  planId: idSchema.nullish(),
  dayId: idSchema.nullish(),
  name: z.string().trim().min(1).max(80).optional(),
  exerciseIds: z.array(idSchema).optional(),
});

export const setSchema = z.object({
  weightKg: z.number().min(0, 'Bitte gib ein gültiges Gewicht ein.').max(1000, 'Das Gewicht ist zu hoch.'),
  reps: z.number().int().min(0, 'Bitte gib eine gültige Wiederholungszahl ein.').max(500),
  rir: z.number().int().min(0).max(10).nullish(),
  rpe: z.number().min(1).max(10).nullish(),
  isWarmup: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(300).optional(),
});

export const finishWorkoutSchema = z.object({
  durationSec: z.number().int().min(0).max(86_400).optional(),
  notes: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

export const foodSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen ein.').max(80),
  brand: z.string().max(60).default(''),
  servingSize: z.number().min(0.1, 'Die Portionsgröße muss größer als 0 sein.').max(10_000).default(100),
  servingUnit: z.enum(['g', 'ml', 'piece', 'portion']).default('g'),
  calories: z.number().min(0, 'Bitte gib gültige Kalorien ein.').max(10_000),
  protein: z.number().min(0).max(1000).default(0),
  carbs: z.number().min(0).max(1000).default(0),
  fat: z.number().min(0).max(1000).default(0),
  category: z.string().max(40).default('other'),
});

export const mealSchema = z.object({
  date: dateKeySchema,
  name: z.string().trim().min(1, 'Bitte gib einen Namen für die Mahlzeit ein.').max(60),
});

export const mealItemSchema = z.object({
  foodId: idSchema.nullish(),
  name: z.string().trim().min(1).max(80).optional(),
  amount: z.number().min(0.1, 'Bitte gib eine gültige Menge ein.').max(10_000),
  unit: z.string().max(12).optional(),
  calories: z.number().min(0).max(20_000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbs: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
});

export const savedMealSchema = z.object({
  name: z.string().trim().min(2, 'Bitte gib einen Namen ein.').max(60),
  mealId: idSchema.optional(),
  items: z
    .array(
      z.object({
        foodId: idSchema.nullish(),
        name: z.string().min(1).max(80),
        amount: z.number().min(0.1).max(10_000),
        unit: z.string().max(12).default('g'),
        calories: z.number().min(0),
        protein: z.number().min(0),
        carbs: z.number().min(0),
        fat: z.number().min(0),
      }),
    )
    .optional(),
});

export const applySavedMealSchema = z.object({
  date: dateKeySchema,
  mealName: z.string().min(1).max(60),
});

// ---------------------------------------------------------------------------
// Body & goals
// ---------------------------------------------------------------------------

const measurementValue = (label: string, max: number) =>
  z.number().min(0, `Bitte gib einen gültigen Wert für ${label} ein.`).max(max).nullish();

export const measurementSchema = z.object({
  date: dateKeySchema,
  weightKg: z.number().min(20, 'Bitte gib ein gültiges Gewicht ein.').max(400, 'Bitte gib ein gültiges Gewicht ein.').nullish(),
  bodyFat: z.number().min(1).max(70).nullish(),
  chestCm: measurementValue('Brust', 300),
  waistCm: measurementValue('Taille', 300),
  hipCm: measurementValue('Hüfte', 300),
  armCm: measurementValue('Oberarm', 150),
  thighCm: measurementValue('Oberschenkel', 200),
  calfCm: measurementValue('Wade', 150),
  notes: z.string().max(500).optional(),
});

export const progressPhotoSchema = z.object({
  date: dateKeySchema,
  imageData: z
    .string()
    .min(20, 'Bitte wähle ein Bild aus.')
    .max(4_000_000, 'Das Bild ist zu groß. Bitte wähle ein kleineres Foto.')
    .refine((v) => v.startsWith('data:image/'), 'Es werden nur Bilddateien unterstützt.'),
  pose: z.enum(['front', 'side', 'back']).default('front'),
  note: z.string().max(300).default(''),
});

export const goalSchema = z.object({
  title: z.string().trim().min(2, 'Bitte gib einen Titel ein.').max(80),
  type: z.enum([
    'exercise_1rm',
    'exercise_weight',
    'bodyweight',
    'workouts_per_week',
    'weekly_volume',
    'daily_calories',
    'daily_protein',
    'custom',
  ]),
  exerciseId: idSchema.nullish(),
  startValue: z.number().min(0).max(1_000_000).default(0),
  targetValue: z.number().min(0.1, 'Bitte gib einen gültigen Zielwert ein.').max(1_000_000),
  currentValue: z.number().min(0).max(1_000_000).optional(),
  unit: z.string().max(20).default(''),
  direction: z.enum(['increase', 'decrease']).default('increase'),
  deadline: z.string().nullish(),
});

export const goalUpdateSchema = goalSchema.partial().extend({
  status: z.enum(['active', 'achieved', 'archived']).optional(),
});

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const reminderSchema = z.object({
  type: z.enum(['workout', 'weigh_in', 'meal', 'protein']),
  title: z.string().trim().min(2, 'Bitte gib einen Titel ein.').max(80),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Bitte gib eine gültige Uhrzeit ein (HH:MM).'),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  enabled: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
