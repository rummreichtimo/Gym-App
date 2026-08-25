import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StartWorkout } from '@/components/workout/StartWorkout';

export const metadata: Metadata = { title: 'Workout wird gestartet' };

export default function StartWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <StartWorkout />
    </Suspense>
  );
}
