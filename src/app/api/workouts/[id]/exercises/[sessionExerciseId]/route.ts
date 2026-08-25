import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { z } from 'zod';
import { recalculateVolume, toSessionDto, workoutSessionInclude } from '@/server/workouts';

type Context = { params: Promise<{ id: string; sessionExerciseId: string }> };

const updateSchema = z.object({
  restSec: z.number().int().min(0).max(900).optional(),
  notes: z.string().max(500).optional(),
});

async function requireSessionExercise(userId: string, sessionId: string, sessionExerciseId: string) {
  const entry = await prisma.sessionExercise.findFirst({
    where: { id: sessionExerciseId, sessionId, session: { userId } },
  });
  if (!entry) throw new NotFoundError('Diese Übung gehört nicht zu diesem Workout.');
  return entry;
}

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id, sessionExerciseId } = await params;
  await requireSessionExercise(user.id, id, sessionExerciseId);
  const input = await parseBody(request, updateSchema);

  await prisma.sessionExercise.update({
    where: { id: sessionExerciseId },
    data: {
      ...(input.restSec !== undefined ? { restSec: input.restSec } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  const session = await prisma.workoutSession.findFirstOrThrow({
    where: { id },
    include: workoutSessionInclude,
  });
  return ok({ session: await toSessionDto(user.id, session) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id, sessionExerciseId } = await params;
  await requireSessionExercise(user.id, id, sessionExerciseId);

  await prisma.sessionExercise.delete({ where: { id: sessionExerciseId } });

  const remaining = await prisma.sessionExercise.findMany({
    where: { sessionId: id },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((row, order) =>
      prisma.sessionExercise.update({ where: { id: row.id }, data: { order } }),
    ),
  );
  await recalculateVolume(id);

  const session = await prisma.workoutSession.findFirstOrThrow({
    where: { id },
    include: workoutSessionInclude,
  });
  return ok({ session: await toSessionDto(user.id, session) });
});
