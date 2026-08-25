import 'server-only';

import { prisma } from './db';
import { suggestProgression } from '@/lib/fitness';
import { toExerciseDto, toSetDto } from './mappers';
import type { PreviousPerformance, SessionExerciseDto, WorkoutSessionDto } from '@/types';

const sessionInclude = {
  exercises: {
    orderBy: { order: 'asc' },
    include: {
      exercise: true,
      sets: { orderBy: { setNumber: 'asc' } },
    },
  },
} as const;

type SessionWithExercises = NonNullable<
  Awaited<ReturnType<typeof prisma.workoutSession.findFirst<{ include: typeof sessionInclude }>>>
>;

/**
 * Finds the most recent completed performance of an exercise, so the workout
 * view can show "last time you did ...".
 */
export async function getPreviousPerformance(
  userId: string,
  exerciseId: string,
  excludeSessionId?: string,
): Promise<PreviousPerformance | null> {
  const entry = await prisma.sessionExercise.findFirst({
    where: {
      exerciseId,
      session: {
        userId,
        status: 'completed',
        ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
      },
      sets: { some: { completed: true, isWarmup: false } },
    },
    include: {
      session: { select: { startedAt: true } },
      sets: { where: { completed: true, isWarmup: false }, orderBy: { setNumber: 'asc' } },
    },
    orderBy: { session: { startedAt: 'desc' } },
  });

  if (!entry || entry.sets.length === 0) return null;

  return {
    date: entry.session.startedAt.toISOString(),
    sets: entry.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, rir: set.rir })),
  };
}

/**
 * Serialises a session and enriches every exercise with its plan targets, the
 * previous performance and a progressive-overload suggestion derived from it.
 */
export async function toSessionDto(
  userId: string,
  session: SessionWithExercises,
): Promise<WorkoutSessionDto> {
  // Plan targets for this session's day, if it came from a plan.
  const planExercises = session.dayId
    ? await prisma.planExercise.findMany({ where: { dayId: session.dayId } })
    : [];
  const targetByExercise = new Map(planExercises.map((row) => [row.exerciseId, row]));

  const exercises: SessionExerciseDto[] = await Promise.all(
    session.exercises.map(async (entry) => {
      const previous = await getPreviousPerformance(userId, entry.exerciseId, session.id);
      const target = targetByExercise.get(entry.exerciseId);

      const suggestion = previous
        ? suggestProgression({
            lastSets: previous.sets.map((set) => ({ ...set, completed: true })),
            repMin: target?.repMin ?? 8,
            repMax: target?.repMax ?? 12,
            increment: incrementFor(entry.exercise.equipment),
          })
        : null;

      return {
        id: entry.id,
        order: entry.order,
        restSec: entry.restSec,
        notes: entry.notes,
        exercise: toExerciseDto(entry.exercise),
        sets: entry.sets.map(toSetDto),
        target: target
          ? {
              sets: target.targetSets,
              repMin: target.repMin,
              repMax: target.repMax,
              weight: target.targetWeight,
            }
          : null,
        previous,
        suggestion,
      };
    }),
  );

  return {
    id: session.id,
    name: session.name,
    status: session.status as 'active' | 'completed',
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
    durationSec: session.durationSec,
    totalVolume: session.totalVolume,
    notes: session.notes,
    planId: session.planId,
    dayId: session.dayId,
    exercises,
  };
}

/** Smallest realistic load jump per equipment type. */
function incrementFor(equipment: string): number {
  switch (equipment) {
    case 'dumbbell':
      return 2;
    case 'cable':
    case 'machine':
      return 5;
    case 'bodyweight':
      return 0;
    default:
      return 2.5;
  }
}

export const workoutSessionInclude = sessionInclude;

/** Recomputes and stores the session's total working-set volume. */
export async function recalculateVolume(sessionId: string): Promise<number> {
  const sets = await prisma.exerciseSet.findMany({
    where: { sessionExercise: { sessionId }, completed: true, isWarmup: false },
    select: { weightKg: true, reps: true },
  });
  const totalVolume = sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
  await prisma.workoutSession.update({ where: { id: sessionId }, data: { totalVolume } });
  return totalVolume;
}

/**
 * Rough energy expenditure of a strength session. Uses a MET-based estimate
 * (~5 MET for resistance training) - a guideline number, not a medical figure.
 */
export function estimateCaloriesBurned(durationSec: number, bodyWeightKg: number | null): number {
  const weight = bodyWeightKg ?? 75;
  const hours = durationSec / 3600;
  return Math.round(5 * weight * hours);
}
