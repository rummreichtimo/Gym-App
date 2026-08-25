import { prisma } from '@/server/db';
import { NotFoundError, ok, withUser } from '@/server/api';

type Context = { params: Promise<{ id: string }> };

export const POST = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Benachrichtigung existiert nicht.');

  await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return ok({ success: true });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Benachrichtigung existiert nicht.');

  await prisma.notification.delete({ where: { id } });
  return ok({ success: true });
});
