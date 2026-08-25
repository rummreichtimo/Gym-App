import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';

export const POST = withUser(async (user) => {
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ success: true });
});
