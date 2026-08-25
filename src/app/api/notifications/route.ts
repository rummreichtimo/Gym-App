import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unread: notifications.filter((notification) => !notification.readAt).length,
  });
});

export const DELETE = withUser(async (user) => {
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  return ok({ success: true });
});
