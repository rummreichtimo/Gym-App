import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';
import { estimate1RM } from '@/lib/fitness';
import { toDateKey } from '@/lib/utils';
import type { ProgressSeriesDto } from '@/types';

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
  const url = new URL(request.url);
  const range = url.searchParams.get('range') ?? '3m';
  const requestedExerciseId = url.searchParams.get('exerciseId');

  const days = RANGE_DAYS[range] ?? 90;
  const fromDate = days === null ? null : new Date(Date.now() - days * 86_400_000);
  const fromKey = fromDate ? toDateKey(fromDate) : null;

  const [measurements, sessions] = await Promise.all([
    prisma.bodyMeasurement.findMany({
      where: { userId: user.id, ...(fromKey ? { date: { gte: fromKey } } : {}) },
      orderBy: { date: 'asc' },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        status: 'completed',
        ...(fromDate ? { startedAt: { gte: fromDate } } : {}),
      },
      select: { startedAt: true, totalVolume: true },
      orderBy: { startedAt: 'asc' },
    }),
  ]);

  // --- Strength progression -------------------------------------------------
  // Defaults to the exercise the user trains most often in this range.
  let strengthExerciseId = requestedExerciseId;
  if (!strengthExerciseId) {
    const grouped = await prisma.sessionExercise.groupBy({
      by: ['exerciseId'],
      where: {
        session: { userId: user.id, status: 'completed', ...(fromDate ? { startedAt: { gte: fromDate } } : {}) },
      },
      _count: { exerciseId: true },
      orderBy: { _count: { exerciseId: 'desc' } },
      take: 1,
    });
    strengthExerciseId = grouped[0]?.exerciseId ?? null;
  }

  let strength: { date: string; value: number }[] = [];
  let strengthExercise: { id: string; name: string } | null = null;

  if (strengthExerciseId) {
    const entries = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: strengthExerciseId,
        session: { userId: user.id, status: 'completed', ...(fromDate ? { startedAt: { gte: fromDate } } : {}) },
      },
      include: {
        exercise: { select: { id: true, name: true } },
        session: { select: { startedAt: true } },
        sets: { where: { completed: true, isWarmup: false } },
      },
      orderBy: { session: { startedAt: 'asc' } },
    });

    strengthExercise = entries[0]?.exercise ?? null;
    strength = entries
      .map((entry) => ({
        date: toDateKey(entry.session.startedAt),
        value:
          Math.round(
            entry.sets.reduce((max, set) => Math.max(max, estimate1RM(set.weightKg, set.reps)), 0) * 10,
          ) / 10,
      }))
      .filter((point) => point.value > 0);
  }

  // --- Volume & frequency per day ------------------------------------------
  const volumeByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();
  for (const session of sessions) {
    const key = toDateKey(session.startedAt);
    volumeByDay.set(key, (volumeByDay.get(key) ?? 0) + session.totalVolume);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  // --- Nutrition per day ----------------------------------------------------
  const nutritionItems = await prisma.mealItem.findMany({
    where: { meal: { userId: user.id, ...(fromKey ? { date: { gte: fromKey } } : {}) } },
    select: { calories: true, protein: true, meal: { select: { date: true } } },
  });
  const caloriesByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const item of nutritionItems) {
    const key = item.meal.date;
    caloriesByDay.set(key, (caloriesByDay.get(key) ?? 0) + item.calories);
    proteinByDay.set(key, (proteinByDay.get(key) ?? 0) + item.protein);
  }

  const toSeries = (map: Map<string, number>, decimals = 0) =>
    [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: Math.round(value * 10 ** decimals) / 10 ** decimals }));

  const measurementSeries = (key: 'chestCm' | 'waistCm' | 'hipCm' | 'armCm' | 'thighCm' | 'calfCm') =>
    measurements
      .filter((entry) => entry[key] !== null)
      .map((entry) => ({ date: entry.date, value: entry[key] as number }));

  const progress: ProgressSeriesDto = {
    bodyWeight: measurements
      .filter((entry) => entry.weightKg !== null)
      .map((entry) => ({ date: entry.date, value: entry.weightKg as number })),
    bodyFat: measurements
      .filter((entry) => entry.bodyFat !== null)
      .map((entry) => ({ date: entry.date, value: entry.bodyFat as number })),
    measurements: {
      chest: measurementSeries('chestCm'),
      waist: measurementSeries('waistCm'),
      hip: measurementSeries('hipCm'),
      arm: measurementSeries('armCm'),
      thigh: measurementSeries('thighCm'),
      calf: measurementSeries('calfCm'),
    },
    volume: toSeries(volumeByDay),
    frequency: toSeries(countByDay),
    calories: toSeries(caloriesByDay),
    protein: toSeries(proteinByDay, 1),
    strength,
    strengthExercise,
  };

  return ok({ progress });
});
