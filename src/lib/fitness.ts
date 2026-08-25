/**
 * Pure training-science helpers. No I/O, no framework code - so they can be
 * used on the server (PR detection, stats) and on the client (live preview).
 */

import { ACTIVITY_LEVELS } from './constants';

export interface SetLike {
  weightKg: number;
  reps: number;
  isWarmup?: boolean;
  completed?: boolean;
}

/** Epley formula, capped at 12 reps where the estimate stays meaningful. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const effectiveReps = Math.min(reps, 12);
  return weightKg * (1 + effectiveReps / 30);
}

export function setVolume(set: SetLike): number {
  return (set.weightKg || 0) * (set.reps || 0);
}

export function workingSets<T extends SetLike>(sets: T[]): T[] {
  return sets.filter((s) => !s.isWarmup && s.completed !== false && s.reps > 0);
}

export function totalVolume(sets: SetLike[]): number {
  return workingSets(sets).reduce((sum, s) => sum + setVolume(s), 0);
}

export function bestSet<T extends SetLike>(sets: T[]): T | null {
  const candidates = workingSets(sets);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, set) =>
    estimate1RM(set.weightKg, set.reps) > estimate1RM(best.weightKg, best.reps) ? set : best,
  );
}

export type PrType = 'max_weight' | 'max_reps' | 'est_1rm' | 'max_volume';

export interface PrCandidate {
  type: PrType;
  value: number;
  weightKg: number;
  reps: number;
}

/**
 * Computes the best values of a single exercise inside one session, so they can
 * be compared against the user's historical bests.
 */
export function sessionBests(sets: SetLike[]): Record<PrType, PrCandidate | null> {
  const working = workingSets(sets);
  const empty = { max_weight: null, max_reps: null, est_1rm: null, max_volume: null };
  if (working.length === 0) return empty as Record<PrType, PrCandidate | null>;

  const heaviest = working.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
  const mostReps = working.reduce((a, b) => (b.reps > a.reps ? b : a));
  const strongest = working.reduce((a, b) =>
    estimate1RM(b.weightKg, b.reps) > estimate1RM(a.weightKg, a.reps) ? b : a,
  );
  const volume = working.reduce((sum, s) => sum + setVolume(s), 0);

  return {
    max_weight: { type: 'max_weight', value: heaviest.weightKg, weightKg: heaviest.weightKg, reps: heaviest.reps },
    max_reps: { type: 'max_reps', value: mostReps.reps, weightKg: mostReps.weightKg, reps: mostReps.reps },
    est_1rm: {
      type: 'est_1rm',
      value: estimate1RM(strongest.weightKg, strongest.reps),
      weightKg: strongest.weightKg,
      reps: strongest.reps,
    },
    max_volume: { type: 'max_volume', value: volume, weightKg: heaviest.weightKg, reps: heaviest.reps },
  };
}

export const PR_LABELS: Record<PrType, string> = {
  max_weight: 'Höchstes Gewicht',
  max_reps: 'Beste Wiederholungszahl',
  est_1rm: 'Bestes geschätztes 1RM',
  max_volume: 'Höchstes Volumen',
};

// ---------------------------------------------------------------------------
// Progressive overload
// ---------------------------------------------------------------------------

export interface OverloadSuggestion {
  headline: string;
  detail: string;
  suggestedWeightKg: number;
  suggestedReps: number;
}

/**
 * Double progression: fill the rep range at the current weight first, then add
 * the smallest available increment and restart at the bottom of the range.
 */
export function suggestProgression(params: {
  lastSets: SetLike[];
  repMin: number;
  repMax: number;
  increment?: number;
}): OverloadSuggestion | null {
  const { repMin, repMax } = params;
  const increment = params.increment ?? 2.5;
  const sets = workingSets(params.lastSets);
  if (sets.length === 0) return null;

  const top = sets.reduce((a, b) =>
    estimate1RM(b.weightKg, b.reps) > estimate1RM(a.weightKg, a.reps) ? b : a,
  );
  const allHitTop = sets.every((s) => s.reps >= repMax);

  if (allHitTop) {
    const weight = round25(top.weightKg + increment);
    return {
      headline: `Zeit für mehr Gewicht: ${fmt(weight)} kg`,
      detail: `Du hast alle Sätze mit ${repMax} Wiederholungen abgeschlossen. Starte heute mit ${fmt(weight)} kg × ${repMin}.`,
      suggestedWeightKg: weight,
      suggestedReps: repMin,
    };
  }

  if (top.reps >= repMax) {
    const heavier = round25(top.weightKg + increment);
    return {
      headline: `${fmt(top.weightKg)} kg × ${top.reps + 1} oder ${fmt(heavier)} kg × ${repMin}`,
      detail: `Letztes Mal: ${fmt(top.weightKg)} kg × ${top.reps}. Hol dir noch eine Wiederholung oder erhöhe das Gewicht.`,
      suggestedWeightKg: top.weightKg,
      suggestedReps: Math.min(top.reps + 1, repMax),
    };
  }

  return {
    headline: `Versuche ${fmt(top.weightKg)} kg × ${top.reps + 1}`,
    detail: `Letztes Mal hast du ${fmt(top.weightKg)} kg × ${top.reps} geschafft. Eine Wiederholung mehr bringt dich näher an ${repMax}.`,
    suggestedWeightKg: top.weightKg,
    suggestedReps: Math.min(top.reps + 1, repMax),
  };
}

function round25(value: number) {
  return Math.round(value * 4) / 4;
}

function fmt(value: number) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value);
}

// ---------------------------------------------------------------------------
// Nutrition targets
// ---------------------------------------------------------------------------

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

/** Mifflin-St Jeor BMR. */
export function calculateBmr(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender?: string | null;
}): number {
  const { weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (params.gender === 'female') return base - 161;
  if (params.gender === 'male') return base + 5;
  return base - 78; // neutral midpoint when gender is not disclosed
}

/**
 * Derives calorie and macro targets from body data, activity and training goal.
 * These are general fitness guidelines, not medical or dietary advice.
 */
export function calculateMacroTargets(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender?: string | null;
  activityLevel: string;
  goal: string;
}): MacroTargets {
  const bmr = calculateBmr(params);
  const factor = ACTIVITY_LEVELS.find((l) => l.key === params.activityLevel)?.factor ?? 1.55;
  const tdee = bmr * factor;

  const calorieAdjustment: Record<string, number> = {
    muscle_gain: 1.1,
    fat_loss: 0.8,
    maintain: 1,
    strength: 1.05,
    fitness: 1,
  };
  const calories = Math.round((tdee * (calorieAdjustment[params.goal] ?? 1)) / 10) * 10;

  const proteinPerKg: Record<string, number> = {
    muscle_gain: 2.0,
    fat_loss: 2.2,
    maintain: 1.8,
    strength: 2.0,
    fitness: 1.6,
  };
  const protein = Math.round(params.weightKg * (proteinPerKg[params.goal] ?? 1.8));

  const fatRatio = params.goal === 'fat_loss' ? 0.25 : 0.28;
  const fat = Math.round((calories * fatRatio) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

// ---------------------------------------------------------------------------
// Streaks & consistency
// ---------------------------------------------------------------------------

/**
 * Counts consecutive weeks (Monday-based) in which the user hit their weekly
 * workout target. A week is only counted from the moment it is complete, so the
 * current week never breaks the streak while it is still running.
 */
export function calculateWeeklyStreak(workoutDateKeys: string[], weeklyTarget: number): number {
  if (workoutDateKeys.length === 0) return 0;
  const target = Math.max(1, weeklyTarget);
  const counts = new Map<string, number>();
  for (const key of workoutDateKeys) {
    const weekKey = mondayKey(key);
    counts.set(weekKey, (counts.get(weekKey) ?? 0) + 1);
  }

  let streak = 0;
  const cursor = mondayDate(new Date());
  // Current week counts toward the streak only if the target is already met.
  if ((counts.get(dateKey(cursor)) ?? 0) >= target) streak += 1;
  cursor.setDate(cursor.getDate() - 7);

  while ((counts.get(dateKey(cursor)) ?? 0) >= target) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Consecutive days up to today (or yesterday) with at least one workout. */
export function calculateDayStreak(workoutDateKeys: string[]): number {
  const days = new Set(workoutDateKeys);
  if (days.size === 0) return 0;
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dateKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayDate(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function mondayKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(mondayDate(new Date(y, m - 1, d)));
}
