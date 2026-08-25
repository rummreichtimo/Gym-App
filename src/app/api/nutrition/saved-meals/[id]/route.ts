import { prisma } from '@/server/db';
import { NotFoundError, ok, withUser } from '@/server/api';

type Context = { params: Promise<{ id: string }> };

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.savedMeal.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese gespeicherte Mahlzeit existiert nicht.');

  await prisma.savedMeal.delete({ where: { id } });
  return ok({ success: true });
});
