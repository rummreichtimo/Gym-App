import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { toSessionDto, workoutSessionInclude, recalculateVolume } from '@/server/workouts';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export const GET = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: workoutSessionInclude,
  });
  if (!session) throw new NotFoundError('Dieses Workout existiert nicht.');

  const prs = await prisma.personalRecord.findMany({
    where: { sessionId: id, userId: user.id },
    include: { exercise: { select: { id: true, name: true } } },
  });

  return ok({
    session: await toSessionDto(user.id, session),
    personalRecords: prs.map((record) => ({
      id: record.id,
      type: record.type,
      value: record.value,
      weightKg: record.weightKg,
      reps: record.reps,
      exerciseName: record.exercise.name,
    })),
  });
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  notes: z.string().max(1000).optional(),
  addExerciseIds: z.array(z.string()).optional(),
});

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const input = await parseBody(request, updateSchema);

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: { exercises: true },
  });
  if (!session) throw new NotFoundError('Dieses Workout existiert nicht.');

  if (input.addExerciseIds?.length) {
    const allowed = await prisma.exercise.findMany({
      where: { id: { in: input.addExerciseIds }, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    });
    const existing = new Set(session.exercises.map((entry) => entry.exerciseId));
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { defaultRestSec: true },
    });

    let order = session.exercises.length;
    for (const exercise of allowed) {
      if (existing.has(exercise.id)) continue;
      await prisma.sessionExercise.create({
        data: {
          sessionId: id,
          exerciseId: exercise.id,
          order: order++,
          restSec: profile?.defaultRestSec ?? 120,
        },
      });
    }
  }

  if (input.name !== undefined || input.notes !== undefined) {
    await prisma.workoutSession.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
  }

  await recalculateVolume(id);
  const updated = await prisma.workoutSession.findFirstOrThrow({
    where: { id },
    include: workoutSessionInclude,
  });
  return ok({ session: await toSessionDto(user.id, updated) });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const session = await prisma.workoutSession.findFirst({ where: { id, userId: user.id } });
  if (!session) throw new NotFoundError('Dieses Workout existiert nicht.');

  await prisma.workoutSession.delete({ where: { id } });
  return ok({ success: true });
});
