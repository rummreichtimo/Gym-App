import { prisma } from '@/server/db';
import { NotFoundError, ok, withUser } from '@/server/api';

type Context = { params: Promise<{ id: string }> };

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.progressPhoto.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieses Foto existiert nicht.');

  await prisma.progressPhoto.delete({ where: { id } });
  return ok({ success: true });
});
