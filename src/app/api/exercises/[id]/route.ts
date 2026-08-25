import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { exerciseSchema } from '@/lib/validation';
import { toExerciseDto } from '@/server/mappers';
import { estimate1RM } from '@/lib/fitness';

type Context = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export const GET = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const exercise = await prisma.exercise.findFirst({
    where: { id, OR: [{ userId: null }, { userId: user.id }] },
  });
  if (!exercise) throw new NotFoundError('Diese Übung existiert nicht.');

  // History of this exercise for the detail view's progression chart.
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { exerciseId: id, session: { userId: user.id, status: 'completed' } },
    include: { session: { select: { id: true, startedAt: true } }, sets: true },
    orderBy: { session: { startedAt: 'desc' } },
    take: 40,
  });

  const history = sessionExercises.map((entry) => {
    const working = entry.sets.filter((set) => !set.isWarmup && set.completed && set.reps > 0);
    const volume = working.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
    const best = working.reduce(
      (max, set) => Math.max(max, estimate1RM(set.weightKg, set.reps)),
      0,
    );
    return {
      sessionId: entry.session.id,
      date: entry.session.startedAt.toISOString(),
      volume,
      estimated1RM: Math.round(best * 10) / 10,
      sets: working.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
    };
  });

  const records = await prisma.personalRecord.findMany({
    where: { userId: user.id, exerciseId: id },
    orderBy: { achievedAt: 'desc' },
  });

  return ok({
    exercise: toExerciseDto(exercise),
    history: history.reverse(),
    records: records.map((record) => ({
      id: record.id,
      type: record.type,
      value: record.value,
      weightKg: record.weightKg,
      reps: record.reps,
      achievedAt: record.achievedAt.toISOString(),
    })),
  });
});

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, exerciseSchema);

  // Only custom exercises owned by this user are editable.
  const existing = await prisma.exercise.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Übung kann nicht bearbeitet werden.');

  const exercise = await prisma.exercise.update({
    where: { id },
    data: {
      name: input.name,
      muscleGroup: input.muscleGroup,
      secondaryMuscles: input.secondaryMuscles.join(','),
      equipment: input.equipment,
      difficulty: input.difficulty,
      description: input.description,
      instructions: input.instructions,
    },
  });

  return ok({ exercise: toExerciseDto(exercise) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.exercise.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Übung kann nicht gelöscht werden.');

  await prisma.exercise.delete({ where: { id } });
  return ok({ success: true });
});
