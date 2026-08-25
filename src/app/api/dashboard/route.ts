import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';
import { getProfile } from '@/server/profile';
import { syncGoalProgress, toGoalDto } from '@/server/goals';
import { estimateCaloriesBurned } from '@/server/workouts';
import { calculateDayStreak, calculateWeeklyStreak } from '@/lib/fitness';
import { roundTotals, sumTotals } from '@/server/nutrition';
import { startOfWeek, toDateKey, weekdayName } from '@/lib/utils';
import { runReminderChecks } from '@/server/reminders';
import type { DashboardDto, WorkoutSummaryDto } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Single aggregated endpoint for the home screen. One round trip keeps the
 * dashboard fast on mobile connections.
 */
export const GET = withUser(async (user) => {
  const profile = await getProfile(user.id);
  await syncGoalProgress(user.id);
  await runReminderChecks(user.id);

  const today = new Date();
  const todayKey = toDateKey(today);
  const weekStart = startOfWeek(today);

  const [activeSession, weekSessions, recentSessions, measurements, goals, unreadCount] =
    await Promise.all([
      prisma.workoutSession.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.workoutSession.findMany({
        where: { userId: user.id, status: 'completed', startedAt: { gte: weekStart } },
        select: { startedAt: true, durationSec: true },
      }),
      prisma.workoutSession.findMany({
        where: { userId: user.id, status: 'completed' },
        include: {
          exercises: { include: { sets: true } },
          _count: { select: { personalRecords: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 5,
      }),
      prisma.bodyMeasurement.findMany({
        where: { userId: user.id, weightKg: { not: null } },
        orderBy: { date: 'desc' },
        take: 2,
      }),
      prisma.goal.findMany({
        where: { userId: user.id, status: 'active' },
        include: { exercise: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

  // --- Today's plan day -----------------------------------------------------
  let todayInfo: DashboardDto['today'] = null;
  let nextWorkout: DashboardDto['nextWorkout'] = null;

  if (profile.activePlanId) {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: profile.activePlanId, userId: user.id },
      include: {
        days: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { exercises: true } } },
        },
      },
    });

    if (plan && plan.days.length > 0) {
      const weekday = today.getDay();
      const todayDay = plan.days.find((day) => day.weekday === weekday);

      if (todayDay) {
        const lastSession = await prisma.workoutSession.findFirst({
          where: { userId: user.id, dayId: todayDay.id, status: 'completed' },
          orderBy: { startedAt: 'desc' },
        });
        todayInfo = {
          dayId: todayDay.id,
          dayName: todayDay.name,
          planName: plan.name,
          exerciseCount: todayDay._count.exercises,
          lastSession: lastSession
            ? {
                date: lastSession.startedAt.toISOString(),
                volume: lastSession.totalVolume,
                durationSec: lastSession.durationSec,
              }
            : null,
        };
      }

      // Look ahead for the next scheduled day; fall back to rotation order.
      const scheduled = plan.days.filter((day) => day.weekday !== null);
      if (scheduled.length > 0) {
        for (let offset = todayDay ? 1 : 0; offset <= 7; offset += 1) {
          const target = (weekday + offset) % 7;
          const match = scheduled.find((day) => day.weekday === target);
          if (match) {
            nextWorkout = {
              dayId: match.id,
              dayName: match.name,
              planName: plan.name,
              weekdayLabel: offset === 0 ? 'Heute' : offset === 1 ? 'Morgen' : weekdayName(target),
            };
            break;
          }
        }
      } else {
        // Unscheduled plan: suggest the day after the most recently trained one.
        const last = await prisma.workoutSession.findFirst({
          where: { userId: user.id, planId: plan.id, status: 'completed', dayId: { not: null } },
          orderBy: { startedAt: 'desc' },
        });
        const lastIndex = plan.days.findIndex((day) => day.id === last?.dayId);
        const next = plan.days[(lastIndex + 1) % plan.days.length];
        if (next) {
          nextWorkout = {
            dayId: next.id,
            dayName: next.name,
            planName: plan.name,
            weekdayLabel: 'Als Nächstes',
          };
        }
      }
    }
  }

  // --- Week progress --------------------------------------------------------
  const weekDayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { key: toDateKey(date), label: weekdayName(date.getDay(), true) };
  });
  const trainedKeys = new Set(weekSessions.map((session) => toDateKey(session.startedAt)));

  // --- Streaks --------------------------------------------------------------
  const allSessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, status: 'completed' },
    select: { startedAt: true },
  });
  const allKeys = allSessions.map((session) => toDateKey(session.startedAt));

  // --- Nutrition today ------------------------------------------------------
  const items = await prisma.mealItem.findMany({
    where: { meal: { userId: user.id, date: todayKey } },
    select: { calories: true, protein: true, carbs: true, fat: true },
  });

  // --- Calories burned this week -------------------------------------------
  const weightKg = measurements[0]?.weightKg ?? null;
  const caloriesBurned = weekSessions.reduce(
    (sum, session) => sum + estimateCaloriesBurned(session.durationSec, weightKg),
    0,
  );

  const recentPrs = await prisma.personalRecord.findMany({
    where: { userId: user.id },
    include: { exercise: { select: { id: true, name: true, muscleGroup: true } } },
    orderBy: { achievedAt: 'desc' },
    take: 4,
  });

  const recentWorkouts: WorkoutSummaryDto[] = recentSessions.map((session) => ({
    id: session.id,
    name: session.name,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
    durationSec: session.durationSec,
    totalVolume: session.totalVolume,
    exerciseCount: session.exercises.length,
    setCount: session.exercises.reduce(
      (sum, entry) => sum + entry.sets.filter((set) => set.completed && !set.isWarmup).length,
      0,
    ),
    prCount: session._count.personalRecords,
    status: session.status,
  }));

  const dashboard: DashboardDto = {
    profile,
    today: todayInfo,
    nextWorkout,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          name: activeSession.name,
          startedAt: activeSession.startedAt.toISOString(),
        }
      : null,
    week: {
      completed: trainedKeys.size,
      target: profile.weeklyTarget,
      days: weekDayKeys.map((day) => ({ ...day, done: trainedKeys.has(day.key) })),
    },
    streak: {
      days: calculateDayStreak(allKeys),
      weeks: calculateWeeklyStreak(allKeys, profile.weeklyTarget),
    },
    bodyWeight: {
      current: measurements[0]?.weightKg ?? null,
      previous: measurements[1]?.weightKg ?? null,
      date: measurements[0]?.date ?? null,
    },
    nutrition: {
      totals: roundTotals(sumTotals(items)),
      targets: {
        calories: profile.calorieTarget,
        protein: profile.proteinTarget,
        carbs: profile.carbTarget,
        fat: profile.fatTarget,
      },
    },
    caloriesBurned,
    recentWorkouts,
    recentPrs: recentPrs.map((record) => ({
      id: record.id,
      type: record.type as 'max_weight' | 'max_reps' | 'est_1rm' | 'max_volume',
      value: record.value,
      weightKg: record.weightKg,
      reps: record.reps,
      achievedAt: record.achievedAt.toISOString(),
      exercise: record.exercise,
    })),
    goals: goals.map(toGoalDto),
    unreadNotifications: unreadCount,
  };

  return ok({ dashboard });
});
