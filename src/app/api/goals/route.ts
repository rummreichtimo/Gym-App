import { prisma } from '@/server/db';
import { ApiError, ok, parseBody, withUser } from '@/server/api';
import { goalSchema } from '@/lib/validation';
import { syncGoalProgress, toGoalDto } from '@/server/goals';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user, request) => {
  await syncGoalProgress(user.id);

  const status = new URL(request.url).searchParams.get('status');
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, ...(status && status !== 'all' ? { status } : {}) },
    include: { exercise: { select: { name: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return ok({ goals: goals.map(toGoalDto) });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, goalSchema);

  if (input.exerciseId) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: input.exerciseId, OR: [{ userId: null }, { userId: user.id }] },
    });
    if (!exercise) throw new ApiError('Diese Übung ist nicht verfügbar.', 400);
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title: input.title,
      type: input.type,
      exerciseId: input.exerciseId ?? null,
      startValue: input.startValue,
      targetValue: input.targetValue,
      currentValue: input.currentValue ?? input.startValue,
      unit: input.unit,
      direction: input.direction,
      deadline: input.deadline ? new Date(input.deadline) : null,
    },
  });

  await syncGoalProgress(user.id);
  const saved = await prisma.goal.findUniqueOrThrow({
    where: { id: goal.id },
    include: { exercise: { select: { name: true } } },
  });
  return ok({ goal: toGoalDto(saved) }, 201);
});
