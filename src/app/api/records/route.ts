import { prisma } from '@/server/db';
import { ok, withUser } from '@/server/api';
import type { PersonalRecordDto } from '@/types';

export const dynamic = 'force-dynamic';

/** All personal records, grouped per exercise (best value per type). */
export const GET = withUser(async (user) => {
  const records = await prisma.personalRecord.findMany({
    where: { userId: user.id },
    include: { exercise: { select: { id: true, name: true, muscleGroup: true } } },
    orderBy: { achievedAt: 'desc' },
  });

  // Keep only the best value per exercise + type combination.
  const best = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = `${record.exerciseId}:${record.type}`;
    const current = best.get(key);
    if (!current || record.value > current.value) best.set(key, record);
  }

  const dtos: PersonalRecordDto[] = [...best.values()].map((record) => ({
    id: record.id,
    type: record.type as PersonalRecordDto['type'],
    value: record.value,
    weightKg: record.weightKg,
    reps: record.reps,
    achievedAt: record.achievedAt.toISOString(),
    exercise: record.exercise,
  }));

  const byExercise = new Map<string, { exercise: PersonalRecordDto['exercise']; records: PersonalRecordDto[] }>();
  for (const record of dtos) {
    const entry = byExercise.get(record.exercise.id) ?? { exercise: record.exercise, records: [] };
    entry.records.push(record);
    byExercise.set(record.exercise.id, entry);
  }

  const groups = [...byExercise.values()].sort((a, b) => {
    const aBest = a.records.find((record) => record.type === 'est_1rm')?.value ?? 0;
    const bBest = b.records.find((record) => record.type === 'est_1rm')?.value ?? 0;
    return bBest - aBest;
  });

  return ok({ records: dtos, groups });
});
