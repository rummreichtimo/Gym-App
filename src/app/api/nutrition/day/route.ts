import { prisma } from '@/server/db';
import { ok, parseQuery, withUser } from '@/server/api';
import { z } from 'zod';
import { dateKeySchema } from '@/lib/validation';
import { getNutritionDay } from '@/server/nutrition';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user, request) => {
  const { date } = parseQuery(request, z.object({ date: dateKeySchema }));
  const day = await getNutritionDay(user.id, date);

  const savedMeals = await prisma.savedMeal.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  return ok({
    day,
    savedMeals: savedMeals.map((meal) => ({
      id: meal.id,
      name: meal.name,
      totals: {
        calories: Math.round(meal.items.reduce((sum, item) => sum + item.calories, 0)),
        protein: Math.round(meal.items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10,
        carbs: Math.round(meal.items.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10,
        fat: Math.round(meal.items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10,
      },
      items: meal.items.map((item) => ({
        foodId: item.foodId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    })),
  });
});
