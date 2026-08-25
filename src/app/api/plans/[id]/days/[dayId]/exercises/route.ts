import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { planExerciseSchema } from '@/lib/validation';
import { toPlanDayDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; dayId: string }> };

export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id, dayId } = await params;
  const input = await parseBody(request, planExerciseSchema);

  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, planId: id, plan: { userId: user.id } },
  });
  if (!day) throw new NotFoundError('Dieser Trainingstag existiert nicht.');

  // The exercise must be part of the shared library or owned by this user.
  const exercise = await prisma.exercise.findFirst({
    where: { id: input.exerciseId, OR: [{ userId: null }, { userId: user.id }] },
  });
  if (!exercise) throw new ApiError('Diese Übung ist nicht verfügbar.', 400);

  const count = await prisma.planExercise.count({ where: { dayId } });
  await prisma.planExercise.create({
    data: {
      dayId,
      exerciseId: input.exerciseId,
      order: count,
      targetSets: input.targetSets,
      repMin: input.repMin,
      repMax: input.repMax,
      targetWeight: input.targetWeight ?? null,
      restSec: input.restSec,
      notes: input.notes,
    },
  });

  const updated = await prisma.workoutDay.findFirstOrThrow({
    where: { id: dayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return ok({ day: toPlanDayDto(updated) }, 201);
});
