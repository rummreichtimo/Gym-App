import 'server-only';

import { prisma } from './db';
import { PR_LABELS, sessionBests, type PrType } from '@/lib/fitness';

export interface DetectedPr {
  exerciseId: string;
  exerciseName: string;
  type: PrType;
  value: number;
  previousValue: number | null;
  weightKg: number;
  reps: number;
}

/**
 * Compares every exercise of a finished session against the user's historical
 * bests and persists any new record. Called once when a workout is completed,
 * so PR detection is fully automatic.
 */
export async function detectAndStorePrs(userId: string, sessionId: string): Promise<DetectedPr[]> {
  const sessionExercises = await prisma.sessionExercise.findMany({
    where: { sessionId },
    include: { exercise: { select: { id: true, name: true } }, sets: true },
  });

  const detected: DetectedPr[] = [];

  for (const entry of sessionExercises) {
    const bests = sessionBests(entry.sets);

    // Historical bests recorded *before* this session.
    const previous = await prisma.personalRecord.findMany({
      where: { userId, exerciseId: entry.exerciseId, NOT: { sessionId } },
    });
    const previousByType = new Map<string, number>();
    for (const record of previous) {
      const current = previousByType.get(record.type) ?? 0;
      if (record.value > current) previousByType.set(record.type, record.value);
    }

    for (const type of Object.keys(bests) as PrType[]) {
      const candidate = bests[type];
      if (!candidate || candidate.value <= 0) continue;

      const previousValue = previousByType.get(type) ?? null;
      // A tie is not a record - only a strict improvement counts.
      if (previousValue !== null && candidate.value <= previousValue + 0.001) continue;

      await prisma.personalRecord.create({
        data: {
          userId,
          exerciseId: entry.exerciseId,
          sessionId,
          type,
          value: candidate.value,
          weightKg: candidate.weightKg,
          reps: candidate.reps,
        },
      });

      detected.push({
        exerciseId: entry.exerciseId,
        exerciseName: entry.exercise.name,
        type,
        value: candidate.value,
        previousValue,
        weightKg: candidate.weightKg,
        reps: candidate.reps,
      });
    }
  }

  return detected;
}

export function prLabel(type: PrType) {
  return PR_LABELS[type];
}

/** The single most impressive record per exercise, for the PR overview. */
export async function getTopRecords(userId: string, limit = 20) {
  const records = await prisma.personalRecord.findMany({
    where: { userId, type: 'est_1rm' },
    include: { exercise: { select: { id: true, name: true, muscleGroup: true } } },
    orderBy: { value: 'desc' },
  });

  const seen = new Set<string>();
  const unique = [];
  for (const record of records) {
    if (seen.has(record.exerciseId)) continue;
    seen.add(record.exerciseId);
    unique.push(record);
    if (unique.length >= limit) break;
  }
  return unique;
}
