/** DTOs shared between the API routes and the client. */

export interface ProfileDto {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  birthDate: string | null;
  heightCm: number | null;
  startWeightKg: number | null;
  gender: string | null;
  goal: string;
  activityLevel: string;
  experience: string;
  weeklyTarget: number;
  weightUnit: 'kg' | 'lb';
  lengthUnit: 'cm' | 'in';
  language: string;
  theme: 'dark' | 'light' | 'system';
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  defaultRestSec: number;
  soundEnabled: boolean;
  notificationsOn: boolean;
  activePlanId: string | null;
  onboardingCompleted: boolean;
}

export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: string;
  description: string;
  instructions: string[];
  isCustom: boolean;
}

export interface PlanExerciseDto {
  id: string;
  order: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  targetWeight: number | null;
  restSec: number;
  notes: string;
  exercise: ExerciseDto;
}

export interface PlanDayDto {
  id: string;
  name: string;
  notes: string;
  order: number;
  weekday: number | null;
  exercises: PlanExerciseDto[];
}

export interface PlanDto {
  id: string;
  name: string;
  description: string;
  isArchived: boolean;
  createdAt: string;
  days: PlanDayDto[];
  isActive?: boolean;
}

export interface PlanSummaryDto {
  id: string;
  name: string;
  description: string;
  dayCount: number;
  exerciseCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface SetDto {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completed: boolean;
  notes: string;
}

export interface SessionExerciseDto {
  id: string;
  order: number;
  restSec: number;
  notes: string;
  exercise: ExerciseDto;
  sets: SetDto[];
  /** Plan targets, when the session originated from a plan day. */
  target?: { sets: number; repMin: number; repMax: number; weight: number | null } | null;
  previous?: PreviousPerformance | null;
  suggestion?: {
    headline: string;
    detail: string;
    suggestedWeightKg: number;
    suggestedReps: number;
  } | null;
}

export interface PreviousPerformance {
  date: string;
  sets: { weightKg: number; reps: number; rir: number | null }[];
}

export interface WorkoutSessionDto {
  id: string;
  name: string;
  status: 'active' | 'completed';
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  totalVolume: number;
  notes: string;
  planId: string | null;
  dayId: string | null;
  exercises: SessionExerciseDto[];
}

export interface WorkoutSummaryDto {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number;
  totalVolume: number;
  exerciseCount: number;
  setCount: number;
  prCount: number;
  status: string;
}

export interface PersonalRecordDto {
  id: string;
  type: 'max_weight' | 'max_reps' | 'est_1rm' | 'max_volume';
  value: number;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string;
  exercise: { id: string; name: string; muscleGroup: string };
}

export interface FoodDto {
  id: string;
  name: string;
  brand: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  isCustom: boolean;
}

export interface MealItemDto {
  id: string;
  foodId: string | null;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealDto {
  id: string;
  name: string;
  order: number;
  date: string;
  items: MealItemDto[];
  totals: MacroTotals;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionDayDto {
  date: string;
  meals: MealDto[];
  totals: MacroTotals;
  targets: MacroTotals;
}

export interface SavedMealDto {
  id: string;
  name: string;
  totals: MacroTotals;
  items: Omit<MealItemDto, 'id'>[];
}

export interface MeasurementDto {
  id: string;
  date: string;
  weightKg: number | null;
  bodyFat: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  notes: string;
}

export interface ProgressPhotoDto {
  id: string;
  date: string;
  imageData: string;
  pose: string;
  note: string;
}

export interface GoalDto {
  id: string;
  title: string;
  type: string;
  exerciseId: string | null;
  exerciseName: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  direction: 'increase' | 'decrease';
  deadline: string | null;
  status: string;
  progress: number;
  remaining: number;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  readAt: string | null;
  createdAt: string;
}

export interface ReminderDto {
  id: string;
  type: string;
  title: string;
  time: string;
  weekdays: number[];
  enabled: boolean;
}

export interface DashboardDto {
  profile: ProfileDto;
  today: {
    dayId: string | null;
    dayName: string | null;
    planName: string | null;
    exerciseCount: number;
    lastSession: { date: string; volume: number; durationSec: number } | null;
  } | null;
  nextWorkout: { dayId: string; dayName: string; planName: string; weekdayLabel: string } | null;
  activeSession: { id: string; name: string; startedAt: string } | null;
  week: { completed: number; target: number; days: { key: string; label: string; done: boolean }[] };
  streak: { days: number; weeks: number };
  bodyWeight: { current: number | null; previous: number | null; date: string | null };
  nutrition: { totals: MacroTotals; targets: MacroTotals };
  caloriesBurned: number;
  recentWorkouts: WorkoutSummaryDto[];
  recentPrs: PersonalRecordDto[];
  goals: GoalDto[];
  unreadNotifications: number;
}

export interface StatsDto {
  totals: {
    workouts: number;
    durationSec: number;
    volume: number;
    sets: number;
    avgDurationSec: number;
    prs: number;
  };
  frequency: { label: string; workouts: number }[];
  muscleVolume: { muscleGroup: string; label: string; volume: number }[];
  topExercises: { name: string; sessions: number; volume: number }[];
  averages: { bodyWeight: number | null; calories: number | null; protein: number | null };
}

export interface ProgressSeriesDto {
  bodyWeight: { date: string; value: number }[];
  bodyFat: { date: string; value: number }[];
  measurements: Record<string, { date: string; value: number }[]>;
  volume: { date: string; value: number }[];
  frequency: { date: string; value: number }[];
  calories: { date: string; value: number }[];
  protein: { date: string; value: number }[];
  strength: { date: string; value: number }[];
  strengthExercise: { id: string; name: string } | null;
}

export interface CalendarDayDto {
  date: string;
  workouts: { id: string; name: string; volume: number }[];
  plannedDayName: string | null;
  hasNutrition: boolean;
  hasMeasurement: boolean;
}
