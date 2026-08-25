import 'server-only';

import { prisma } from './db';

/**
 * Creates an in-app notification. `dedupeKey` makes generated notifications
 * (streaks, goal milestones, rest reminders) safe to re-evaluate on every page
 * load without spamming the user.
 */
export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  icon?: string;
  dedupeKey?: string;
}) {
  const profile = await prisma.profile.findUnique({
    where: { userId: params.userId },
    select: { notificationsOn: true },
  });
  if (profile && !profile.notificationsOn) return null;

  const data = {
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? '',
    icon: params.icon ?? 'bell',
    dedupeKey: params.dedupeKey ?? null,
  };

  if (!params.dedupeKey) return prisma.notification.create({ data });

  const existing = await prisma.notification.findUnique({
    where: { userId_dedupeKey: { userId: params.userId, dedupeKey: params.dedupeKey } },
  });
  if (existing) return existing;

  return prisma.notification.create({ data }).catch(() => null);
}
