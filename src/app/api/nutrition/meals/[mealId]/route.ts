import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { z } from 'zod';
import { getNutritionDay } from '@/server/nutrition';

type Context = { params: Promise<{ mealId: string }> };

const renameSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(60),
});

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { mealId } = await params;
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) throw new NotFoundError('Diese Mahlzeit existiert nicht.');

  const { name } = await parseBody(request, renameSchema);
  await prisma.meal.update({ where: { id: mealId }, data: { name } });

  return ok({ day: await getNutritionDay(user.id, meal.date) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { mealId } = await params;
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) throw new NotFoundError('Diese Mahlzeit existiert nicht.');

  await prisma.meal.delete({ where: { id: mealId } });
  return ok({ day: await getNutritionDay(user.id, meal.date) });
});
