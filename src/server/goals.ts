import 'server-only';

import { prisma } from './db';
import { estimate1RM } from '@/lib/fitness';
import { startOfWeek, toDateKey } from '@/lib/utils';
import { notify } from './notifications';
import type { GoalDto } from '@/types';

/**
 * Recomputes `currentValue` for every active goal from the user's real data,
 * and flips a goal to "achieved" (plus a notification) once the target is met.
 * Called after workouts, measurements and nutrition changes.
 */
export async function syncGoalProgress(userId: string): Promise<void> {
  const goals = await prisma.goal.findMany({ where: { userId, status: 'active' } });
  if (goals.length === 0) return;

  for (const goal of goals) {
    const value = await currentValueFor(userId, goal);
    if (value === null) continue;

    const reached =
      goal.direction === 'decrease' ? value <= goal.targetValue : value >= goal.targetValue;

    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentValue: value,
        ...(reached ? { status: 'achieved', achievedAt: new Date() } : {}),
      },
    });

    if (reached) {
      await notify({
        userId,
        type: 'goal',
        icon: 'target',
        title: `Ziel erreicht: ${goal.title}`,
        body: 'Zeit, dir ein neues Ziel zu setzen.',
        dedupeKey: `goal:${goal.id}`,
      });
    }
  }
}

async function currentValueFor(
  userId: string,
  goal: { type: string; exerciseId: string | null; currentValue: number },
): Promise<number | null> {
  switch (goal.type) {
    case 'exercise_1rm': {
      if (!goal.exerciseId) return null;
      const record = await prisma.personalRecord.findFirst({
        where: { userId, exerciseId: goal.exerciseId, type: 'est_1rm' },
        orderBy: { value: 'desc' },
      });
      return record ? Math.round(record.value * 10) / 10 : 0;
    }
    case 'exercise_weight': {
      if (!goal.exerciseId) return null;
      const record = await prisma.personalRecord.findFirst({
        where: { userId, exerciseId: goal.exerciseId, type: 'max_weight' },
        orderBy: { value: 'desc' },
      });
      return record?.value ?? 0;
    }
    case 'bodyweight': {
      const measurement = await prisma.bodyMeasurement.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: 'desc' },
      });
      return measurement?.weightKg ?? null;
    }
    case 'workouts_per_week': {
      const from = startOfWeek();
      const count = await prisma.workoutSession.count({
        where: { userId, status: 'completed', startedAt: { gte: from } },
      });
      return count;
    }
    case 'weekly_volume': {
      const from = startOfWeek();
      const sessions = await prisma.workoutSession.findMany({
        where: { userId, status: 'completed', startedAt: { gte: from } },
        select: { totalVolume: true },
      });
      return Math.round(sessions.reduce((sum, session) => sum + session.totalVolume, 0));
    }
    case 'daily_calories':
    case 'daily_protein': {
      const items = await prisma.mealItem.findMany({
        where: { meal: { userId, date: toDateKey() } },
        select: { calories: true, protein: true },
      });
      const total = items.reduce(
        (sum, item) => sum + (goal.type === 'daily_calories' ? item.calories : item.protein),
        0,
      );
      return Math.round(total);
    }
    default:
      // Custom goals are tracked manually by the user.
      return null;
  }
}

export function toGoalDto(goal: {
  id: string;
  title: string;
  type: string;
  exerciseId: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  direction: string;
  deadline: Date | null;
  status: string;
  exercise?: { name: string } | null;
}): GoalDto {
  const { startValue, targetValue, currentValue, direction } = goal;

  // Progress is measured from the starting point toward the target so that a
  // "lose weight" goal shows sensible values too.
  let progress: number;
  if (direction === 'decrease') {
    const span = startValue - targetValue;
    progress = span > 0 ? (startValue - currentValue) / span : currentValue <= targetValue ? 1 : 0;
  } else {
    const span = targetValue - startValue;
    progress = span > 0 ? (currentValue - startValue) / span : currentValue >= targetValue ? 1 : 0;
  }

  const remaining =
    direction === 'decrease'
      ? Math.max(0, currentValue - targetValue)
      : Math.max(0, targetValue - currentValue);

  return {
    id: goal.id,
    title: goal.title,
    type: goal.type,
    exerciseId: goal.exerciseId,
    exerciseName: goal.exercise?.name ?? null,
    startValue,
    targetValue,
    currentValue,
    unit: goal.unit,
    direction: direction as 'increase' | 'decrease',
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    status: goal.status,
    progress: Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)),
    remaining: Math.round(remaining * 10) / 10,
  };
}
