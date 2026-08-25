import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { planSchema } from '@/lib/validation';
import { toPlanDto } from '@/server/mappers';

type Context = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

const planInclude = {
  days: {
    orderBy: { order: 'asc' },
    include: {
      exercises: { orderBy: { order: 'asc' }, include: { exercise: true } },
    },
  },
} as const;

export const GET = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const [plan, profile] = await Promise.all([
    prisma.workoutPlan.findFirst({ where: { id, userId: user.id }, include: planInclude }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { activePlanId: true } }),
  ]);
  if (!plan) throw new NotFoundError('Dieser Trainingsplan existiert nicht.');

  return ok({ plan: toPlanDto(plan, profile?.activePlanId ?? null) });
});

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, planSchema);

  const existing = await prisma.workoutPlan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieser Trainingsplan existiert nicht.');

  await prisma.workoutPlan.update({
    where: { id },
    data: { name: input.name, description: input.description },
  });

  const [plan, profile] = await Promise.all([
    prisma.workoutPlan.findFirstOrThrow({ where: { id }, include: planInclude }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { activePlanId: true } }),
  ]);
  return ok({ plan: toPlanDto(plan, profile?.activePlanId ?? null) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.workoutPlan.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieser Trainingsplan existiert nicht.');

  await prisma.workoutPlan.delete({ where: { id } });

  // Fall back to another plan so the dashboard keeps working.
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (profile?.activePlanId === id) {
    const next = await prisma.workoutPlan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { activePlanId: next?.id ?? null },
    });
  }

  return ok({ success: true });
});
