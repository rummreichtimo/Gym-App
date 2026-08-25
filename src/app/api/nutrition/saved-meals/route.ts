import { prisma } from '@/server/db';
import { ApiError, ok, parseBody, withUser } from '@/server/api';
import { savedMealSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => {
  const meals = await prisma.savedMeal.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ savedMeals: meals });
});

/**
 * Saves a meal template - either from an existing logged meal ("Mahlzeit
 * speichern") or from an explicit list of items.
 */
export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, savedMealSchema);

  let items = input.items ?? [];

  if (input.mealId) {
    const meal = await prisma.meal.findFirst({
      where: { id: input.mealId, userId: user.id },
      include: { items: true },
    });
    if (!meal) throw new ApiError('Diese Mahlzeit existiert nicht.', 404);
    if (meal.items.length === 0) {
      throw new ApiError('Diese Mahlzeit enthält noch keine Lebensmittel.', 400);
    }
    items = meal.items.map((item) => ({
      foodId: item.foodId,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    }));
  }

  if (items.length === 0) {
    throw new ApiError('Eine gespeicherte Mahlzeit braucht mindestens ein Lebensmittel.', 400);
  }

  const saved = await prisma.savedMeal.create({
    data: {
      userId: user.id,
      name: input.name,
      items: {
        create: items.map((item) => ({
          foodId: item.foodId ?? null,
          name: item.name,
          amount: item.amount,
          unit: item.unit ?? 'g',
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        })),
      },
    },
    include: { items: true },
  });

  return ok({ savedMeal: saved }, 201);
});
