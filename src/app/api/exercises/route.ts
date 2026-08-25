import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { ok, parseBody, parseQuery, withUser } from '@/server/api';
import { exerciseQuerySchema, exerciseSchema } from '@/lib/validation';
import { toExerciseDto } from '@/server/mappers';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user, request) => {
  const query = parseQuery(request, exerciseQuerySchema);

  // Visible library = shared seeded exercises + the user's own custom ones.
  const where: Prisma.ExerciseWhereInput = {
    OR: [{ userId: null }, { userId: user.id }],
  };
  const and: Prisma.ExerciseWhereInput[] = [];

  if (query.search?.trim()) {
    and.push({ name: { contains: query.search.trim() } });
  }
  if (query.muscleGroup && query.muscleGroup !== 'all') {
    and.push({
      OR: [
        { muscleGroup: query.muscleGroup },
        { secondaryMuscles: { contains: query.muscleGroup } },
      ],
    });
  }
  if (query.equipment && query.equipment !== 'all') and.push({ equipment: query.equipment });
  if (query.difficulty && query.difficulty !== 'all') and.push({ difficulty: query.difficulty });
  if (query.custom === 'true') and.push({ userId: user.id });
  if (and.length > 0) where.AND = and;

  const exercises = await prisma.exercise.findMany({ where, orderBy: { name: 'asc' } });
  return ok({ exercises: exercises.map(toExerciseDto) });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, exerciseSchema);

  const exercise = await prisma.exercise.create({
    data: {
      userId: user.id,
      name: input.name,
      muscleGroup: input.muscleGroup,
      secondaryMuscles: input.secondaryMuscles.join(','),
      equipment: input.equipment,
      difficulty: input.difficulty,
      description: input.description,
      instructions: input.instructions,
      isCustom: true,
    },
  });

  return ok({ exercise: toExerciseDto(exercise) }, 201);
});
