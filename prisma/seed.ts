/**
 * Seeds the shared exercise and food libraries (userId = null).
 * Idempotent: running it again updates existing entries instead of duplicating.
 */
import { PrismaClient } from '@prisma/client';
import { SEED_EXERCISES } from './data/exercises';
import { SEED_FOODS } from './data/foods';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding exercise library...');
  for (const exercise of SEED_EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { userId: null, name: exercise.name },
    });
    const data = {
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      secondaryMuscles: exercise.secondaryMuscles.join(','),
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      description: exercise.description,
      instructions: exercise.instructions.join('\n'),
      isCustom: false,
      userId: null,
    };
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
    } else {
      await prisma.exercise.create({ data });
    }
  }
  console.log(`  ${SEED_EXERCISES.length} exercises ready.`);

  console.log('Seeding food database...');
  for (const food of SEED_FOODS) {
    const existing = await prisma.food.findFirst({
      where: { userId: null, name: food.name },
    });
    const data = {
      name: food.name,
      brand: food.brand ?? '',
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      category: food.category,
      isCustom: false,
      userId: null,
    };
    if (existing) {
      await prisma.food.update({ where: { id: existing.id }, data });
    } else {
      await prisma.food.create({ data });
    }
  }
  console.log(`  ${SEED_FOODS.length} foods ready.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
