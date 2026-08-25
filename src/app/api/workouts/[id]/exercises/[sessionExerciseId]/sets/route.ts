import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { setSchema } from '@/lib/validation';
import { recalculateVolume } from '@/server/workouts';
import { toSetDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; sessionExerciseId: string }> };

/** Logs one set. Every set is persisted immediately - nothing lives only in memory. */
export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id, sessionExerciseId } = await params;
  const input = await parseBody(request, setSchema);

  const entry = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, sessionId: id, session: { userId: user.id } },
    include: { session: { select: { status: true } }, sets: { select: { setNumber: true } } },
  });
  if (!entry) throw new NotFoundError('Diese Übung gehört nicht zu diesem Workout.');
  if (entry.session.status !== 'active') {
    throw new ApiError('Dieses Workout ist bereits abgeschlossen.', 400);
  }

  const setNumber = entry.sets.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1;

  const set = await prisma.exerciseSet.create({
    data: {
      sessionExerciseId,
      setNumber,
      weightKg: input.weightKg,
      reps: input.reps,
      rir: input.rir ?? null,
      rpe: input.rpe ?? null,
      isWarmup: input.isWarmup ?? false,
      completed: input.completed ?? true,
      notes: input.notes ?? '',
    },
  });

  const totalVolume = await recalculateVolume(id);
  return ok({ set: toSetDto(set), totalVolume }, 201);
});
