import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { planExerciseUpdateSchema } from '@/lib/validation';
import { toPlanDayDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; dayId: string; planExerciseId: string }> };

async function requirePlanExercise(userId: string, planId: string, dayId: string, planExerciseId: string) {
  const record = await prisma.planExercise.findFirst({
    where: { id: planExerciseId, dayId, day: { planId, plan: { userId } } },
  });
  if (!record) throw new NotFoundError('Diese Übung ist nicht Teil des Trainingstags.');
  return record;
}

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id, dayId, planExerciseId } = await params;
  const existing = await requirePlanExercise(user.id, id, dayId, planExerciseId);
  const input = await parseBody(request, planExerciseUpdateSchema);

  const repMin = input.repMin ?? existing.repMin;
  const repMax = input.repMax ?? existing.repMax;
  if (repMax < repMin) {
    throw new ApiError('Bitte überprüfe deine Eingaben.', 422, {
      repMax: ['Der maximale Wiederholungsbereich muss größer oder gleich dem minimalen sein.'],
    });
  }

  await prisma.planExercise.update({
    where: { id: planExerciseId },
    data: {
      ...(input.targetSets !== undefined ? { targetSets: input.targetSets } : {}),
      repMin,
      repMax,
      ...(input.targetWeight !== undefined ? { targetWeight: input.targetWeight ?? null } : {}),
      ...(input.restSec !== undefined ? { restSec: input.restSec } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  const day = await prisma.workoutDay.findFirstOrThrow({
    where: { id: dayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return ok({ day: toPlanDayDto(day) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id, dayId, planExerciseId } = await params;
  await requirePlanExercise(user.id, id, dayId, planExerciseId);
  await prisma.planExercise.delete({ where: { id: planExerciseId } });

  // Close the gap in the ordering so drag handles stay predictable.
  const remaining = await prisma.planExercise.findMany({
    where: { dayId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((row, order) => prisma.planExercise.update({ where: { id: row.id }, data: { order } })),
  );

  const day = await prisma.workoutDay.findFirstOrThrow({
    where: { id: dayId },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });
  return ok({ day: toPlanDayDto(day) });
});
