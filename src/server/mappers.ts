import 'server-only';

import type { ExerciseDto, PlanDayDto, PlanDto, SetDto } from '@/types';

interface ExerciseRecord {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string;
  equipment: string;
  difficulty: string;
  description: string;
  instructions: string;
  isCustom: boolean;
}

export function toExerciseDto(exercise: ExerciseRecord): ExerciseDto {
  return {
    id: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    secondaryMuscles: exercise.secondaryMuscles ? exercise.secondaryMuscles.split(',').filter(Boolean) : [],
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    description: exercise.description,
    instructions: exercise.instructions ? exercise.instructions.split('\n').filter(Boolean) : [],
    isCustom: exercise.isCustom,
  };
}

interface PlanExerciseRecord {
  id: string;
  order: number;
  targetSets: number;
  repMin: number;
  repMax: number;
  targetWeight: number | null;
  restSec: number;
  notes: string;
  exercise: ExerciseRecord;
}

interface PlanDayRecord {
  id: string;
  name: string;
  notes: string;
  order: number;
  weekday: number | null;
  exercises: PlanExerciseRecord[];
}

export function toPlanDayDto(day: PlanDayRecord): PlanDayDto {
  return {
    id: day.id,
    name: day.name,
    notes: day.notes,
    order: day.order,
    weekday: day.weekday,
    exercises: day.exercises.map((planExercise) => ({
      id: planExercise.id,
      order: planExercise.order,
      targetSets: planExercise.targetSets,
      repMin: planExercise.repMin,
      repMax: planExercise.repMax,
      targetWeight: planExercise.targetWeight,
      restSec: planExercise.restSec,
      notes: planExercise.notes,
      exercise: toExerciseDto(planExercise.exercise),
    })),
  };
}

export function toPlanDto(
  plan: { id: string; name: string; description: string; isArchived: boolean; createdAt: Date; days: PlanDayRecord[] },
  activePlanId: string | null,
): PlanDto {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    isArchived: plan.isArchived,
    createdAt: plan.createdAt.toISOString(),
    isActive: plan.id === activePlanId,
    days: plan.days.map(toPlanDayDto),
  };
}

export function toSetDto(set: {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  isWarmup: boolean;
  completed: boolean;
  notes: string;
}): SetDto {
  return {
    id: set.id,
    setNumber: set.setNumber,
    weightKg: set.weightKg,
    reps: set.reps,
    rir: set.rir,
    rpe: set.rpe,
    isWarmup: set.isWarmup,
    completed: set.completed,
    notes: set.notes,
  };
}
