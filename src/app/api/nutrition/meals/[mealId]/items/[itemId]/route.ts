import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { z } from 'zod';
import { getNutritionDay, scaleFood } from '@/server/nutrition';
import { syncGoalProgress } from '@/server/goals';

type Context = { params: Promise<{ mealId: string; itemId: string }> };

const amountSchema = z.object({
  amount: z.number().min(0.1, 'Bitte gib eine gültige Menge ein.').max(10_000),
});

/** Changing the portion size recalculates all macros from the source food. */
export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { mealId, itemId } = await params;
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId, mealId, meal: { userId: user.id } },
    include: { meal: true, food: true },
  });
  if (!item) throw new NotFoundError('Dieser Eintrag existiert nicht.');

  const { amount } = await parseBody(request, amountSchema);

  // With a linked food we rescale from its reference values; without one we
  // scale the stored snapshot proportionally.
  const macros = item.food
    ? scaleFood(item.food, amount)
    : scaleFood(
        {
          servingSize: item.amount,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
        amount,
      );

  await prisma.mealItem.update({
    where: { id: itemId },
    data: {
      amount,
      calories: Math.round(macros.calories * 10) / 10,
      protein: Math.round(macros.protein * 10) / 10,
      carbs: Math.round(macros.carbs * 10) / 10,
      fat: Math.round(macros.fat * 10) / 10,
    },
  });

  await syncGoalProgress(user.id);
  return ok({ day: await getNutritionDay(user.id, item.meal.date) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { mealId, itemId } = await params;
  const item = await prisma.mealItem.findFirst({
    where: { id: itemId, mealId, meal: { userId: user.id } },
    include: { meal: true },
  });
  if (!item) throw new NotFoundError('Dieser Eintrag existiert nicht.');

  await prisma.mealItem.delete({ where: { id: itemId } });
  await syncGoalProgress(user.id);
  return ok({ day: await getNutritionDay(user.id, item.meal.date) });
});
