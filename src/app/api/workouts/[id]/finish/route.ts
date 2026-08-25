import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { finishWorkoutSchema } from '@/lib/validation';
import { estimateCaloriesBurned, recalculateVolume } from '@/server/workouts';
import { detectAndStorePrs, prLabel } from '@/server/records';
import { notify } from '@/server/notifications';
import { syncGoalProgress } from '@/server/goals';
import { calculateDayStreak } from '@/lib/fitness';
import { toDateKey } from '@/lib/utils';

type Context = { params: Promise<{ id: string }> };

/**
 * Completes a workout: drops empty sets, stores duration and volume, detects
 * personal records, refreshes goal progress and raises the matching in-app
 * notifications. Returns everything the summary screen needs.
 */
export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, finishWorkoutSchema);

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) throw new NotFoundError('Dieses Workout existiert nicht.');
  if (session.status === 'completed') {
    throw new ApiError('Dieses Workout wurde bereits abgeschlossen.', 400);
  }

  // Sets that were never filled in should not pollute the history.
  await prisma.exerciseSet.deleteMany({
    where: { sessionExercise: { sessionId: id }, reps: 0, weightKg: 0 },
  });
  // Exercises the user skipped entirely are removed as well.
  const emptyExercises = await prisma.sessionExercise.findMany({
    where: { sessionId: id, sets: { none: {} } },
    select: { id: true },
  });
  if (emptyExercises.length > 0) {
    await prisma.sessionExercise.deleteMany({
      where: { id: { in: emptyExercises.map((entry) => entry.id) } },
    });
  }

  const finishedAt = new Date();
  const elapsed = Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000);
  const durationSec = input.durationSec ?? elapsed;

  await prisma.workoutSession.update({
    where: { id },
    data: {
      status: 'completed',
      finishedAt,
      durationSec,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  const totalVolume = await recalculateVolume(id);
  const prs = await detectAndStorePrs(user.id, id);

  const stats = await prisma.sessionExercise.findMany({
    where: { sessionId: id },
    include: { sets: { where: { completed: true, isWarmup: false } } },
  });
  const setCount = stats.reduce((sum, entry) => sum + entry.sets.length, 0);

  const measurement = await prisma.bodyMeasurement.findFirst({
    where: { userId: user.id, weightKg: { not: null } },
    orderBy: { date: 'desc' },
  });
  const caloriesBurned = estimateCaloriesBurned(durationSec, measurement?.weightKg ?? null);

  // Notifications: PRs first, then the streak milestone.
  for (const pr of prs.filter((record) => record.type === 'est_1rm' || record.type === 'max_weight')) {
    await notify({
      userId: user.id,
      type: 'pr',
      icon: 'trophy',
      title: `Neuer Rekord: ${pr.exerciseName}`,
      body: `${prLabel(pr.type)} – ${formatValue(pr)}`,
      dedupeKey: `pr:${id}:${pr.exerciseId}:${pr.type}`,
    });
  }

  const history = await prisma.workoutSession.findMany({
    where: { userId: user.id, status: 'completed' },
    select: { startedAt: true },
  });
  const dateKeys = history.map((entry) => toDateKey(entry.startedAt));
  const dayStreak = calculateDayStreak(dateKeys);
  if (dayStreak >= 3) {
    await notify({
      userId: user.id,
      type: 'streak',
      icon: 'flame',
      title: `${dayStreak} Tage in Folge aktiv`,
      body: 'Bleib dran – Konstanz schlägt Intensität.',
      dedupeKey: `streak:${toDateKey()}:${dayStreak}`,
    });
  }
  if (history.length > 0 && history.length % 20 === 0) {
    await notify({
      userId: user.id,
      type: 'streak',
      icon: 'medal',
      title: `${history.length} Workouts abgeschlossen`,
      body: 'Ein starker Meilenstein. Weiter so!',
      dedupeKey: `milestone:${history.length}`,
    });
  }

  await syncGoalProgress(user.id);

  return ok({
    summary: {
      id,
      name: session.name,
      durationSec,
      exerciseCount: stats.length,
      setCount,
      totalVolume,
      caloriesBurned,
      prs: prs.map((pr) => ({
        exerciseName: pr.exerciseName,
        type: pr.type,
        label: prLabel(pr.type),
        value: pr.value,
        weightKg: pr.weightKg,
        reps: pr.reps,
        previousValue: pr.previousValue,
      })),
    },
  });
});

function formatValue(pr: { type: string; value: number; weightKg: number; reps: number }) {
  const number = (value: number) =>
    new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
  if (pr.type === 'max_reps') return `${pr.reps} Wiederholungen bei ${number(pr.weightKg)} kg`;
  if (pr.type === 'max_volume') return `${number(pr.value)} kg Volumen`;
  if (pr.type === 'est_1rm') return `${number(pr.value)} kg geschätztes 1RM`;
  return `${number(pr.weightKg)} kg × ${pr.reps}`;
}
