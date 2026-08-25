import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { setSchema } from '@/lib/validation';
import { recalculateVolume } from '@/server/workouts';
import { toSetDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; sessionExerciseId: string; setId: string }> };

async function requireSet(userId: string, sessionId: string, sessionExerciseId: string, setId: string) {
  const set = await prisma.exerciseSet.findFirst({
    where: {
      id: setId,
      sessionExerciseId,
      sessionExercise: { sessionId, session: { userId } },
    },
    include: { sessionExercise: { include: { session: { select: { status: true } } } } },
  });
  if (!set) throw new NotFoundError('Dieser Satz existiert nicht.');
  return set;
}

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id, sessionExerciseId, setId } = await params;
  const existing = await requireSet(user.id, id, sessionExerciseId, setId);
  if (existing.sessionExercise.session.status !== 'active') {
    throw new ApiError('Ein abgeschlossenes Workout kann nicht mehr geändert werden.', 400);
  }

  const input = await parseBody(request, setSchema.partial());

  const set = await prisma.exerciseSet.update({
    where: { id: setId },
    data: {
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
      ...(input.reps !== undefined ? { reps: input.reps } : {}),
      ...(input.rir !== undefined ? { rir: input.rir ?? null } : {}),
      ...(input.rpe !== undefined ? { rpe: input.rpe ?? null } : {}),
      ...(input.isWarmup !== undefined ? { isWarmup: input.isWarmup } : {}),
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  const totalVolume = await recalculateVolume(id);
  return ok({ set: toSetDto(set), totalVolume });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id, sessionExerciseId, setId } = await params;
  await requireSet(user.id, id, sessionExerciseId, setId);

  await prisma.exerciseSet.delete({ where: { id: setId } });

  // Renumber so set numbers stay 1..n after a deletion in the middle.
  const remaining = await prisma.exerciseSet.findMany({
    where: { sessionExerciseId },
    orderBy: { setNumber: 'asc' },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((row, index) =>
      prisma.exerciseSet.update({ where: { id: row.id }, data: { setNumber: index + 1 } }),
    ),
  );

  const totalVolume = await recalculateVolume(id);
  return ok({ success: true, totalVolume });
});
