import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { mealSchema } from '@/lib/validation';
import { getNutritionDay } from '@/server/nutrition';

/** Adds a custom meal (e.g. "Pre-Workout Shake") to one day. */
export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, mealSchema);

  const count = await prisma.meal.count({ where: { userId: user.id, date: input.date } });
  await prisma.meal.create({
    data: { userId: user.id, date: input.date, name: input.name, order: count },
  });

  return ok({ day: await getNutritionDay(user.id, input.date) }, 201);
});
