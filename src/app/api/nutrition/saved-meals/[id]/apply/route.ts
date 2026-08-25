import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { applySavedMealSchema } from '@/lib/validation';
import { getNutritionDay } from '@/server/nutrition';
import { syncGoalProgress } from '@/server/goals';

type Context = { params: Promise<{ id: string }> };

/** Copies a saved meal into a day, creating the target meal if needed. */
export const POST = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, applySavedMealSchema);

  const saved = await prisma.savedMeal.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!saved) throw new NotFoundError('Diese gespeicherte Mahlzeit existiert nicht.');

  // Make sure the day's default meals exist before we look one up.
  await getNutritionDay(user.id, input.date);

  let meal = await prisma.meal.findFirst({
    where: { userId: user.id, date: input.date, name: input.mealName },
  });
  if (!meal) {
    const count = await prisma.meal.count({ where: { userId: user.id, date: input.date } });
    meal = await prisma.meal.create({
      data: { userId: user.id, date: input.date, name: input.mealName, order: count },
    });
  }

  await prisma.mealItem.createMany({
    data: saved.items.map((item) => ({
      mealId: meal.id,
      foodId: item.foodId,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    })),
  });

  await syncGoalProgress(user.id);
  return ok({ day: await getNutritionDay(user.id, input.date) });
});
