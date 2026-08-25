import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { planDaySchema } from '@/lib/validation';
import { toPlanDayDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string }> };

export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, planDaySchema);

  const plan = await prisma.workoutPlan.findFirst({ where: { id, userId: user.id } });
  if (!plan) throw new NotFoundError('Dieser Trainingsplan existiert nicht.');

  const count = await prisma.workoutDay.count({ where: { planId: id } });
  const day = await prisma.workoutDay.create({
    data: {
      planId: id,
      name: input.name,
      notes: input.notes ?? '',
      weekday: input.weekday ?? null,
      order: input.order ?? count,
    },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  });

  return ok({ day: toPlanDayDto(day) }, 201);
});
