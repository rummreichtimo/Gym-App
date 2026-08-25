import type { Metadata } from 'next';
import { ActiveWorkout } from '@/components/workout/ActiveWorkout';

export const metadata: Metadata = { title: 'Workout' };

export default function ActiveWorkoutPage() {
  return <ActiveWorkout />;
}
