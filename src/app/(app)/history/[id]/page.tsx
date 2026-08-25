import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth';
import { prisma } from '@/server/db';
import { TopBar } from '@/components/layout/TopBar';
import { WorkoutDetail } from '@/components/history/WorkoutDetail';
import { PR_LABELS, type PrType } from '@/lib/fitness';

export const metadata: Metadata = { title: 'Workout-Details' };

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          exercise: { select: { id: true, name: true, muscleGroup: true } },
          sets: { orderBy: { setNumber: 'asc' } },
        },
      },
      personalRecords: { include: { exercise: { select: { name: true } } } },
    },
  });
  if (!session) notFound();

  return (
    <>
      <TopBar title={session.name} backHref="/history" />
      <WorkoutDetail
        workout={{
          id: session.id,
          name: session.name,
          startedAt: session.startedAt.toISOString(),
          durationSec: session.durationSec,
          totalVolume: session.totalVolume,
          notes: session.notes,
          exercises: session.exercises.map((entry) => ({
            id: entry.id,
            name: entry.exercise.name,
            exerciseId: entry.exercise.id,
            muscleGroup: entry.exercise.muscleGroup,
            notes: entry.notes,
            sets: entry.sets.map((set) => ({
              setNumber: set.setNumber,
              weightKg: set.weightKg,
              reps: set.reps,
              rir: set.rir,
              isWarmup: set.isWarmup,
            })),
          })),
          personalRecords: session.personalRecords.map((record) => ({
            id: record.id,
            exerciseName: record.exercise.name,
            label: PR_LABELS[record.type as PrType] ?? record.type,
            type: record.type,
            value: record.value,
            weightKg: record.weightKg ?? 0,
            reps: record.reps ?? 0,
          })),
        }}
      />
    </>
  );
}
