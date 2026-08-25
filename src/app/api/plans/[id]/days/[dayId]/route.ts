import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { planDaySchema } from '@/lib/validation';
import { toPlanDayDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string; dayId: string }> };

/** Verifies the day belongs to a plan owned by the user. */
async function requireDay(userId: string, planId: string, dayId: string) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, planId, plan: { userId } },
  });
  if (!day) throw new NotFoundError('Dieser Trainingstag existiert nicht.');
  return day;
}

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id, dayId } = await params;
  await requireDay(user.id, id, dayId);
  const input = await parseBody(request, planDaySchema);

  const day = await prisma.workoutDay.update({
    where: { id: dayId },
    data: {
      name: input.name,
      notes: input.notes ?? '',
      weekday: input.weekday ?? null,
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });

  return ok({ day: toPlanDayDto(day) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id, dayId } = await params;
  await requireDay(user.id, id, dayId);
  await prisma.workoutDay.delete({ where: { id: dayId } });
  return ok({ success: true });
});
