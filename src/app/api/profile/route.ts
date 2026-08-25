import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { profileSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => ok({ profile: await getProfile(user.id) }));

export const PATCH = withUser(async (user, request) => {
  const input = await parseBody(request, profileSchema);

  // Only pass through keys that were actually sent, so a partial update never
  // clears unrelated fields.
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === 'birthDate') {
      data.birthDate = value ? new Date(String(value)) : null;
      continue;
    }
    data[key] = value;
  }

  // Guard against pointing activePlanId at a plan the user does not own.
  if (typeof data.activePlanId === 'string') {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: data.activePlanId, userId: user.id },
      select: { id: true },
    });
    if (!plan) data.activePlanId = null;
  }

  await prisma.profile.update({ where: { userId: user.id }, data });
  return ok({ profile: await getProfile(user.id) });
});
