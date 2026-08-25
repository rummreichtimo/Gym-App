import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';
import { MUSCLE_GROUPS, labelFor } from '@/lib/constants';
import { monthName, startOfWeek, toDateKey } from '@/lib/utils';
import type { StatsDto } from '@/types';

export const dynamic = 'force-dynamic';

const RANGE_DAYS: Record<string, number | null> = {
  '7d': 7,
  '30d': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  all: null,
};

export const GET = withUser(async (user, request) => {
  const range = new URL(request.url).searchParams.get('range') ?? '3m';
  const days = RANGE_DAYS[range] ?? 90;
  const from = days === null ? undefined : new Date(Date.now() - days * 86_400_000);

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, status: 'completed', ...(from ? { startedAt: { gte: from } } : {}) },
    include: {
      exercises: {
        include: {
          exercise: { select: { name: true, muscleGroup: true } },
          sets: { where: { completed: true, isWarmup: false } },
        },
      },
    },
    orderBy: { startedAt: 'asc' },
  });

  const totalDuration = sessions.reduce((sum, session) => sum + session.durationSec, 0);
  const totalVolume = sessions.reduce((sum, session) => sum + session.totalVolume, 0);
  const totalSets = sessions.reduce(
    (sum, session) => sum + session.exercises.reduce((inner, entry) => inner + entry.sets.length, 0),
    0,
  );

  // --- Volume per muscle group ---------------------------------------------
  const muscleVolume = new Map<string, number>();
  const exerciseStats = new Map<string, { sessions: number; volume: number }>();

  for (const session of sessions) {
    for (const entry of session.exercises) {
      const volume = entry.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
      const group = entry.exercise.muscleGroup;
      muscleVolume.set(group, (muscleVolume.get(group) ?? 0) + volume);

      const current = exerciseStats.get(entry.exercise.name) ?? { sessions: 0, volume: 0 };
      exerciseStats.set(entry.exercise.name, {
        sessions: current.sessions + 1,
        volume: current.volume + volume,
      });
    }
  }

  // --- Workout frequency ----------------------------------------------------
  // Weeks for short ranges, months for long ones - keeps the chart readable.
  const useWeeks = days !== null && days <= 90;
  const frequency = new Map<string, number>();
  for (const session of sessions) {
    const key = useWeeks
      ? toDateKey(startOfWeek(session.startedAt))
      : `${session.startedAt.getFullYear()}-${String(session.startedAt.getMonth() + 1).padStart(2, '0')}`;
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }

  const frequencySeries = [...frequency.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, workouts]) => {
      if (useWeeks) {
        const [, month, day] = key.split('-');
        return { label: `${day}.${month}.`, workouts };
      }
      const [, month] = key.split('-');
      return { label: monthName(Number(month) - 1).slice(0, 3), workouts };
    });

  // --- Averages -------------------------------------------------------------
  const [measurements, nutritionItems, prCount] = await Promise.all([
    prisma.bodyMeasurement.findMany({
      where: { userId: user.id, weightKg: { not: null }, ...(from ? { date: { gte: toDateKey(from) } } : {}) },
      select: { weightKg: true },
    }),
    prisma.mealItem.findMany({
      where: { meal: { userId: user.id, ...(from ? { date: { gte: toDateKey(from) } } : {}) } },
      select: { calories: true, protein: true, meal: { select: { date: true } } },
    }),
    prisma.personalRecord.count({
      where: { userId: user.id, ...(from ? { achievedAt: { gte: from } } : {}) },
    }),
  ]);

  const avgWeight =
    measurements.length > 0
      ? measurements.reduce((sum, entry) => sum + (entry.weightKg ?? 0), 0) / measurements.length
      : null;

  const byDay = new Map<string, { calories: number; protein: number }>();
  for (const item of nutritionItems) {
    const current = byDay.get(item.meal.date) ?? { calories: 0, protein: 0 };
    byDay.set(item.meal.date, {
      calories: current.calories + item.calories,
      protein: current.protein + item.protein,
    });
  }
  const nutritionDays = [...byDay.values()];
  const avgCalories =
    nutritionDays.length > 0
      ? nutritionDays.reduce((sum, day) => sum + day.calories, 0) / nutritionDays.length
      : null;
  const avgProtein =
    nutritionDays.length > 0
      ? nutritionDays.reduce((sum, day) => sum + day.protein, 0) / nutritionDays.length
      : null;

  const stats: StatsDto = {
    totals: {
      workouts: sessions.length,
      durationSec: totalDuration,
      volume: Math.round(totalVolume),
      sets: totalSets,
      avgDurationSec: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      prs: prCount,
    },
    frequency: frequencySeries,
    muscleVolume: [...muscleVolume.entries()]
      .map(([muscleGroup, volume]) => ({
        muscleGroup,
        label: labelFor(MUSCLE_GROUPS, muscleGroup),
        volume: Math.round(volume),
      }))
      .filter((entry) => entry.volume > 0)
      .sort((a, b) => b.volume - a.volume),
    topExercises: [...exerciseStats.entries()]
      .map(([name, value]) => ({ name, sessions: value.sessions, volume: Math.round(value.volume) }))
      .sort((a, b) => b.sessions - a.sessions || b.volume - a.volume)
      .slice(0, 8),
    averages: {
      bodyWeight: avgWeight === null ? null : Math.round(avgWeight * 10) / 10,
      calories: avgCalories === null ? null : Math.round(avgCalories),
      protein: avgProtein === null ? null : Math.round(avgProtein),
    },
  };

  return ok({ stats });
});
