import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { z } from 'zod';
import { toSessionDto, workoutSessionInclude } from '@/server/workouts';

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({ exerciseId: z.string().min(1) });

/** Adds a single exercise to a running workout. */
export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const { exerciseId } = await parseBody(request, bodySchema);

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: { exercises: true },
  });
  if (!session) throw new NotFoundError('Dieses Workout existiert nicht.');
  if (session.status !== 'active') {
    throw new ApiError('Dieses Workout ist bereits abgeschlossen.', 400);
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, OR: [{ userId: null }, { userId: user.id }] },
  });
  if (!exercise) throw new ApiError('Diese Übung ist nicht verfügbar.', 400);

  if (session.exercises.some((entry) => entry.exerciseId === exerciseId)) {
    throw new ApiError('Diese Übung ist bereits Teil des Workouts.', 409);
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { defaultRestSec: true },
  });

  await prisma.sessionExercise.create({
    data: {
      sessionId: id,
      exerciseId,
      order: session.exercises.length,
      restSec: profile?.defaultRestSec ?? 120,
    },
  });

  const updated = await prisma.workoutSession.findFirstOrThrow({
    where: { id },
    include: workoutSessionInclude,
  });
  return ok({ session: await toSessionDto(user.id, updated) }, 201);
});
