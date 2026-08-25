export const APP_NAME = 'IronPath';
export const APP_TAGLINE = 'Dein Weg. Dein Eisen.';

export const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Brust' },
  { key: 'back', label: 'Rücken' },
  { key: 'shoulders', label: 'Schultern' },
  { key: 'biceps', label: 'Bizeps' },
  { key: 'triceps', label: 'Trizeps' },
  { key: 'legs', label: 'Beine' },
  { key: 'quads', label: 'Quadrizeps' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'calves', label: 'Waden' },
  { key: 'abs', label: 'Bauch' },
  { key: 'forearms', label: 'Unterarme' },
] as const;

export type MuscleGroupKey = (typeof MUSCLE_GROUPS)[number]['key'];

export const EQUIPMENT = [
  { key: 'barbell', label: 'Langhantel' },
  { key: 'dumbbell', label: 'Kurzhantel' },
  { key: 'cable', label: 'Kabelzug' },
  { key: 'machine', label: 'Maschine' },
  { key: 'bodyweight', label: 'Körpergewicht' },
  { key: 'smith', label: 'Smith Machine' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'band', label: 'Widerstandsband' },
] as const;

export type EquipmentKey = (typeof EQUIPMENT)[number]['key'];

export const DIFFICULTIES = [
  { key: 'beginner', label: 'Anfänger' },
  { key: 'intermediate', label: 'Fortgeschritten' },
  { key: 'advanced', label: 'Profi' },
] as const;

export const TRAINING_GOALS = [
  { key: 'muscle_gain', label: 'Muskelaufbau', description: 'Masse und Volumen aufbauen' },
  { key: 'fat_loss', label: 'Fettverlust', description: 'Definieren und Fett reduzieren' },
  { key: 'maintain', label: 'Gewicht halten', description: 'Form und Gewicht stabil halten' },
  { key: 'strength', label: 'Kraft steigern', description: 'Maximalkraft erhöhen' },
  { key: 'fitness', label: 'Allgemeine Fitness', description: 'Gesund und leistungsfähig bleiben' },
] as const;

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Kaum aktiv', factor: 1.2, description: 'Sitzender Alltag' },
  { key: 'light', label: 'Leicht aktiv', factor: 1.375, description: '1–2 Einheiten / Woche' },
  { key: 'moderate', label: 'Moderat aktiv', factor: 1.55, description: '3–4 Einheiten / Woche' },
  { key: 'active', label: 'Sehr aktiv', factor: 1.725, description: '5–6 Einheiten / Woche' },
  { key: 'very_active', label: 'Extrem aktiv', factor: 1.9, description: 'Täglich / körperlicher Job' },
] as const;

export const EXPERIENCE_LEVELS = [
  { key: 'beginner', label: 'Anfänger', description: 'Weniger als 1 Jahr Training' },
  { key: 'intermediate', label: 'Fortgeschritten', description: '1–3 Jahre Training' },
  { key: 'advanced', label: 'Profi', description: 'Mehr als 3 Jahre Training' },
] as const;

export const GENDERS = [
  { key: 'male', label: 'Männlich' },
  { key: 'female', label: 'Weiblich' },
  { key: 'other', label: 'Divers' },
  { key: 'undisclosed', label: 'Keine Angabe' },
] as const;

export const DEFAULT_MEALS = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snacks'] as const;

export const FOOD_CATEGORIES = [
  { key: 'protein', label: 'Proteinquellen' },
  { key: 'carbs', label: 'Kohlenhydrate' },
  { key: 'fat', label: 'Fette & Nüsse' },
  { key: 'vegetables', label: 'Gemüse' },
  { key: 'fruit', label: 'Obst' },
  { key: 'dairy', label: 'Milchprodukte' },
  { key: 'drinks', label: 'Getränke' },
  { key: 'snacks', label: 'Snacks & Süßes' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'meals', label: 'Fertiggerichte' },
  { key: 'other', label: 'Sonstiges' },
] as const;

export const GOAL_TYPES = [
  { key: 'exercise_1rm', label: 'Geschätztes 1RM', unit: 'kg', needsExercise: true, direction: 'increase' },
  { key: 'exercise_weight', label: 'Arbeitsgewicht', unit: 'kg', needsExercise: true, direction: 'increase' },
  { key: 'bodyweight', label: 'Körpergewicht', unit: 'kg', needsExercise: false, direction: 'decrease' },
  { key: 'workouts_per_week', label: 'Workouts pro Woche', unit: 'Workouts', needsExercise: false, direction: 'increase' },
  { key: 'weekly_volume', label: 'Wochenvolumen', unit: 'kg', needsExercise: false, direction: 'increase' },
  { key: 'daily_calories', label: 'Kalorien pro Tag', unit: 'kcal', needsExercise: false, direction: 'increase' },
  { key: 'daily_protein', label: 'Protein pro Tag', unit: 'g', needsExercise: false, direction: 'increase' },
  { key: 'custom', label: 'Eigenes Ziel', unit: '', needsExercise: false, direction: 'increase' },
] as const;

export const REMINDER_TYPES = [
  { key: 'workout', label: 'Training', description: 'Erinnerung an dein geplantes Workout' },
  { key: 'weigh_in', label: 'Gewicht messen', description: 'Regelmäßig Körperdaten eintragen' },
  { key: 'meal', label: 'Mahlzeit tracken', description: 'Erinnerung ans Ernährungstagebuch' },
  { key: 'protein', label: 'Protein-Ziel', description: 'Check-in auf deine Proteinzufuhr' },
] as const;

export function labelFor(
  list: readonly { key: string; label: string }[],
  key: string | null | undefined,
  fallback = '—',
) {
  if (!key) return fallback;
  return list.find((item) => item.key === key)?.label ?? key;
}
