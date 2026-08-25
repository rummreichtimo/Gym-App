import 'server-only';

import { prisma } from './db';
import { DEFAULT_MEALS } from '@/lib/constants';
import type { MacroTotals, MealDto, NutritionDayDto } from '@/types';

export function emptyTotals(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function sumTotals(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat,
    }),
    emptyTotals(),
  );
}

export function roundTotals(totals: MacroTotals): MacroTotals {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
  };
}

/**
 * Scales a food's reference nutrition to an arbitrary amount.
 * 100 g rice at 350 kcal -> 200 g gives 700 kcal.
 */
export function scaleFood(
  food: { servingSize: number; calories: number; protein: number; carbs: number; fat: number },
  amount: number,
): MacroTotals {
  const factor = food.servingSize > 0 ? amount / food.servingSize : 0;
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  };
}

/**
 * Loads one nutrition day, creating the four default meals the first time a
 * day is opened so the user always has somewhere to log food.
 */
export async function getNutritionDay(userId: string, date: string): Promise<NutritionDayDto> {
  let meals = await prisma.meal.findMany({
    where: { userId, date },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  if (meals.length === 0) {
    await prisma.meal.createMany({
      data: DEFAULT_MEALS.map((name, order) => ({ userId, date, name, order })),
    });
    meals = await prisma.meal.findMany({
      where: { userId, date },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  const mealDtos: MealDto[] = meals.map((meal) => {
    const items = meal.items.map((item) => ({
      id: item.id,
      foodId: item.foodId,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    }));
    return {
      id: meal.id,
      name: meal.name,
      order: meal.order,
      date: meal.date,
      items,
      totals: roundTotals(sumTotals(items)),
    };
  });

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { calorieTarget: true, proteinTarget: true, carbTarget: true, fatTarget: true },
  });

  return {
    date,
    meals: mealDtos,
    totals: roundTotals(sumTotals(mealDtos.map((meal) => meal.totals))),
    targets: {
      calories: profile?.calorieTarget ?? 2400,
      protein: profile?.proteinTarget ?? 160,
      carbs: profile?.carbTarget ?? 280,
      fat: profile?.fatTarget ?? 80,
    },
  };
}
