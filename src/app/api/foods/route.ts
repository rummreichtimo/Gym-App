import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { foodSchema } from '@/lib/validation';
import type { FoodDto } from '@/types';

export const dynamic = 'force-dynamic';

function toFoodDto(food: {
  id: string; name: string; brand: string; servingSize: number; servingUnit: string;
  calories: number; protein: number; carbs: number; fat: number; category: string; isCustom: boolean;
}): FoodDto {
  return { ...food };
}

export const GET = withUser(async (user, request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const category = url.searchParams.get('category') ?? '';
  const onlyCustom = url.searchParams.get('custom') === 'true';

  const where: Prisma.FoodWhereInput = {
    OR: [{ userId: null }, { userId: user.id }],
  };
  const and: Prisma.FoodWhereInput[] = [];
  if (search) {
    // Case-insensitive on PostgreSQL, where plain `contains` would be LIKE.
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (category && category !== 'all') and.push({ category });
  if (onlyCustom) and.push({ userId: user.id });
  if (and.length > 0) where.AND = and;

  const foods = await prisma.food.findMany({
    where,
    orderBy: [{ isCustom: 'desc' }, { name: 'asc' }],
    take: 200,
  });

  return ok({ foods: foods.map(toFoodDto) });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, foodSchema);

  const food = await prisma.food.create({
    data: { ...input, userId: user.id, isCustom: true },
  });

  return ok({ food: toFoodDto(food) }, 201);
});
