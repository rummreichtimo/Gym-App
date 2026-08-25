import { prisma } from '@/server/db';
import { ok, parseQuery, withUser } from '@/server/api';
import { z } from 'zod';
import { toDateKey } from '@/lib/utils';
import type { CalendarDayDto } from '@/types';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const GET = withUser(async (user, request) => {
  const { year, month } = parseQuery(request, querySchema);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const startKey = toDateKey(start);
  const endKey = toDateKey(new Date(end.getTime() - 86_400_000));

  const [sessions, nutritionMeals, measurements, profile] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: 'completed', startedAt: { gte: start, lt: end } },
      select: { id: true, name: true, totalVolume: true, startedAt: true },
    }),
    prisma.meal.findMany({
      where: { userId: user.id, date: { gte: startKey, lte: endKey }, items: { some: {} } },
      select: { date: true },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId: user.id, date: { gte: startKey, lte: endKey } },
      select: { date: true },
    }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { activePlanId: true } }),
  ]);

  // Scheduled days of the active plan, mapped onto weekdays.
  const planDays = profile?.activePlanId
    ? await prisma.workoutDay.findMany({
        where: { planId: profile.activePlanId, weekday: { not: null } },
        select: { name: true, weekday: true },
      })
    : [];
  const plannedByWeekday = new Map(planDays.map((day) => [day.weekday as number, day.name]));

  const nutritionDays = new Set(nutritionMeals.map((meal) => meal.date));
  const measurementDays = new Set(measurements.map((entry) => entry.date));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDayDto[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const key = toDateKey(date);
    const workouts = sessions
      .filter((session) => toDateKey(session.startedAt) === key)
      .map((session) => ({ id: session.id, name: session.name, volume: session.totalVolume }));

    days.push({
      date: key,
      workouts,
      // Only show a plan for future days that have not been trained yet.
      plannedDayName:
        workouts.length === 0 && date >= new Date(new Date().toDateString())
          ? plannedByWeekday.get(date.getDay()) ?? null
          : null,
      hasNutrition: nutritionDays.has(key),
      hasMeasurement: measurementDays.has(key),
    });
  }

  return ok({ days });
});
