import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';
import { toSessionDto, workoutSessionInclude } from '@/server/workouts';

export const dynamic = 'force-dynamic';

/** The currently running workout, if any - used to resume after a reload. */
export const GET = withUser(async (user) => {
  const session = await prisma.workoutSession.findFirst({
    where: { userId: user.id, status: 'active' },
    include: workoutSessionInclude,
    orderBy: { startedAt: 'desc' },
  });

  if (!session) return ok({ session: null });
  return ok({ session: await toSessionDto(user.id, session) });
});
