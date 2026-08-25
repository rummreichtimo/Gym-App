import { prisma } from '@/server/db';
import { ApiError, NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { mealItemSchema } from '@/lib/validation';
import { getNutritionDay, scaleFood } from '@/server/nutrition';
import { syncGoalProgress } from '@/server/goals';

type Context = { params: Promise<{ mealId: string }> };

/**
 * Logs a food into a meal. Nutrition values are computed server-side from the
 * food's reference values and stored as a snapshot on the item.
 */
export const POST = withUser<Context>(async (user, request, { params }) => {
  const { mealId } = await params;
  const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) throw new NotFoundError('Diese Mahlzeit existiert nicht.');

  const input = await parseBody(request, mealItemSchema);

  let name = input.name?.trim() ?? '';
  let unit = input.unit ?? 'g';
  let macros = {
    calories: input.calories ?? 0,
    protein: input.protein ?? 0,
    carbs: input.carbs ?? 0,
    fat: input.fat ?? 0,
  };

  if (input.foodId) {
    const food = await prisma.food.findFirst({
      where: { id: input.foodId, OR: [{ userId: null }, { userId: user.id }] },
    });
    if (!food) throw new ApiError('Dieses Lebensmittel ist nicht verfügbar.', 400);

    name = name || food.name;
    unit = food.servingUnit;
    macros = scaleFood(food, input.amount);
  } else if (!name) {
    throw new ApiError('Bitte gib einen Namen für den Eintrag an.', 422, {
      name: ['Bitte gib einen Namen ein.'],
    });
  }

  await prisma.mealItem.create({
    data: {
      mealId,
      foodId: input.foodId ?? null,
      name,
      amount: input.amount,
      unit,
      calories: Math.round(macros.calories * 10) / 10,
      protein: Math.round(macros.protein * 10) / 10,
      carbs: Math.round(macros.carbs * 10) / 10,
      fat: Math.round(macros.fat * 10) / 10,
    },
  });

  await syncGoalProgress(user.id);
  return ok({ day: await getNutritionDay(user.id, meal.date) }, 201);
});
