import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { reorderSchema } from '@/lib/validation';
import { toPlanDayDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; dayId: string }> };

export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id, dayId } = await params;
  const { ids } = await parseBody(request, reorderSchema);

  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, planId: id, plan: { userId: user.id } },
    include: { exercises: { select: { id: true } } },
  });
  if (!day) throw new NotFoundError('Dieser Trainingstag existiert nicht.');

  const owned = new Set(day.exercises.map((exercise) => exercise.id));
  await prisma.$transaction(
    ids
      .filter((planExerciseId) => owned.has(planExerciseId))
      .map((planExerciseId, order) =>
        prisma.planExercise.update({ where: { id: planExerciseId }, data: { order } }),
      ),
  );

  const updated = await prisma.workoutDay.findFirstOrThrow({
    where: { id: dayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return ok({ day: toPlanDayDto(updated) });
});
