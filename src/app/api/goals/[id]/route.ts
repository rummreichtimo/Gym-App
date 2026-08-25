import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { goalUpdateSchema } from '@/lib/validation';
import { syncGoalProgress, toGoalDto } from '@/server/goals';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieses Ziel existiert nicht.');

  const input = await parseBody(request, goalUpdateSchema);

  await prisma.goal.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId ?? null } : {}),
      ...(input.startValue !== undefined ? { startValue: input.startValue } : {}),
      ...(input.targetValue !== undefined ? { targetValue: input.targetValue } : {}),
      ...(input.currentValue !== undefined ? { currentValue: input.currentValue } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline ? new Date(input.deadline) : null } : {}),
      ...(input.status !== undefined
        ? { status: input.status, achievedAt: input.status === 'achieved' ? new Date() : null }
        : {}),
    },
  });

  await syncGoalProgress(user.id);
  const goal = await prisma.goal.findUniqueOrThrow({
    where: { id },
    include: { exercise: { select: { name: true } } },
  });
  return ok({ goal: toGoalDto(goal) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieses Ziel existiert nicht.');

  await prisma.goal.delete({ where: { id } });
  return ok({ success: true });
});
