import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { prisma } from '@/server/db';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';
import { estimateCaloriesBurned } from '@/server/workouts';
import { PR_LABELS, type PrType } from '@/lib/fitness';

export const metadata: Metadata = { title: 'Workout abgeschlossen' };

export default async function WorkoutSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          exercise: { select: { name: true } },
          sets: { where: { completed: true, isWarmup: false }, orderBy: { setNumber: 'asc' } },
        },
      },
      personalRecords: { include: { exercise: { select: { name: true } } } },
    },
  });
  if (!session) notFound();

  const measurement = await prisma.bodyMeasurement.findFirst({
    where: { userId: user.id, weightKg: { not: null } },
    orderBy: { date: 'desc' },
  });

  return (
    <WorkoutSummary
      summary={{
        id: session.id,
        name: session.name,
        durationSec: session.durationSec,
        totalVolume: session.totalVolume,
        exerciseCount: session.exercises.length,
        setCount: session.exercises.reduce((sum, entry) => sum + entry.sets.length, 0),
        caloriesBurned: estimateCaloriesBurned(session.durationSec, measurement?.weightKg ?? null),
        exercises: session.exercises.map((entry) => ({
          name: entry.exercise.name,
          sets: entry.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
        })),
        prs: session.personalRecords.map((record) => ({
          exerciseName: record.exercise.name,
          label: PR_LABELS[record.type as PrType] ?? record.type,
          type: record.type,
          value: record.value,
          weightKg: record.weightKg ?? 0,
          reps: record.reps ?? 0,
        })),
      }}
    />
  );
}
