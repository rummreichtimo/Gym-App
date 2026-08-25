import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { planSchema } from '@/lib/validation';
import type { PlanSummaryDto } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => {
  const [plans, profile] = await Promise.all([
    prisma.workoutPlan.findMany({
      where: { userId: user.id },
      include: { days: { include: { _count: { select: { exercises: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { activePlanId: true } }),
  ]);

  const summaries: PlanSummaryDto[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    dayCount: plan.days.length,
    exerciseCount: plan.days.reduce((sum, day) => sum + day._count.exercises, 0),
    isActive: plan.id === profile?.activePlanId,
    createdAt: plan.createdAt.toISOString(),
  }));

  return ok({ plans: summaries, activePlanId: profile?.activePlanId ?? null });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, planSchema);

  const plan = await prisma.workoutPlan.create({
    data: { userId: user.id, name: input.name, description: input.description },
  });

  // The very first plan becomes the active one automatically.
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { activePlanId: true },
  });
  if (!profile?.activePlanId) {
    await prisma.profile.update({ where: { userId: user.id }, data: { activePlanId: plan.id } });
  }

  return ok({ plan: { id: plan.id, name: plan.name } }, 201);
});
