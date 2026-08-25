import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { reorderSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const { ids } = await parseBody(request, reorderSchema);

  const plan = await prisma.workoutPlan.findFirst({
    where: { id, userId: user.id },
    include: { days: { select: { id: true } } },
  });
  if (!plan) throw new NotFoundError('Dieser Trainingsplan existiert nicht.');

  // Ignore any id that is not part of this plan.
  const owned = new Set(plan.days.map((day) => day.id));
  const updates = ids
    .filter((dayId) => owned.has(dayId))
    .map((dayId, order) => prisma.workoutDay.update({ where: { id: dayId }, data: { order } }));

  await prisma.$transaction(updates);
  return ok({ success: true });
});
