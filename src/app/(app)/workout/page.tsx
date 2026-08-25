import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { WorkoutHub } from '@/components/workout/WorkoutHub';

export const metadata: Metadata = { title: 'Workout starten' };

export default function WorkoutPage() {
  return (
    <>
      <TopBar title="Workout starten" />
      <WorkoutHub />
    </>
  );
}
