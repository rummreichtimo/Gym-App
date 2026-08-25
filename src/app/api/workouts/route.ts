import { prisma } from '@/server/db';
import { ApiError, ok, parseBody, withUser } from '@/server/api';
import { startWorkoutSchema } from '@/lib/validation';
import { toSessionDto, workoutSessionInclude } from '@/server/workouts';
import { toDateKey } from '@/lib/utils';
import type { WorkoutSummaryDto } from '@/types';

export const dynamic = 'force-dynamic';

/** Workout history (completed sessions), newest first. */
export const GET = withUser(async (user, request) => {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 30) || 30, 100);
  const cursor = url.searchParams.get('cursor');

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, status: 'completed' },
    include: {
      exercises: { include: { sets: true } },
      _count: { select: { personalRecords: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = sessions.length > limit;
  const page = hasMore ? sessions.slice(0, limit) : sessions;

  const workouts: WorkoutSummaryDto[] = page.map((session) => ({
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

  return ok({ workouts, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null });
});

/** Starts a new workout - from a plan day, from picked exercises, or empty. */
export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, startWorkoutSchema);

  const running = await prisma.workoutSession.findFirst({
    where: { userId: user.id, status: 'active' },
  });
  if (running) {
    throw new ApiError(
      'Du hast bereits ein laufendes Workout. Beende es zuerst, um ein neues zu starten.',
      409,
    );
  }

  let name = input.name?.trim() || 'Freies Workout';
  let planId: string | null = null;
  let dayId: string | null = null;
  let exerciseIds: string[] = [];
  let restByExercise = new Map<string, number>();

  if (input.dayId) {
    const day = await prisma.workoutDay.findFirst({
      where: { id: input.dayId, plan: { userId: user.id } },
      include: { exercises: { orderBy: { order: 'asc' } }, plan: true },
    });
    if (!day) throw new ApiError('Dieser Trainingstag existiert nicht.', 404);

    planId = day.planId;
    dayId = day.id;
    name = input.name?.trim() || day.name;
    exerciseIds = day.exercises.map((entry) => entry.exerciseId);
    restByExercise = new Map(day.exercises.map((entry) => [entry.exerciseId, entry.restSec]));
  } else if (input.exerciseIds?.length) {
    // Keep only exercises the user is actually allowed to use.
    const allowed = await prisma.exercise.findMany({
      where: { id: { in: input.exerciseIds }, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    });
    const allowedIds = new Set(allowed.map((exercise) => exercise.id));
    exerciseIds = input.exerciseIds.filter((id) => allowedIds.has(id));
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { defaultRestSec: true },
  });
  const defaultRest = profile?.defaultRestSec ?? 120;

  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      planId,
      dayId,
      name,
      status: 'active',
      exercises: {
        create: exerciseIds.map((exerciseId, order) => ({
          exerciseId,
          order,
          restSec: restByExercise.get(exerciseId) ?? defaultRest,
        })),
      },
    },
    include: workoutSessionInclude,
  });

  return ok({ session: await toSessionDto(user.id, session), today: toDateKey() }, 201);
});
