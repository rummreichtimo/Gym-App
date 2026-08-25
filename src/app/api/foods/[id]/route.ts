import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { foodSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const existing = await prisma.food.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieses Lebensmittel kann nicht bearbeitet werden.');

  const input = await parseBody(request, foodSchema);
  const food = await prisma.food.update({ where: { id }, data: input });
  return ok({ food });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.food.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Dieses Lebensmittel kann nicht gelöscht werden.');

  // Logged meal items keep their nutrition snapshot (foodId is set to null).
  await prisma.food.delete({ where: { id } });
  return ok({ success: true });
});
