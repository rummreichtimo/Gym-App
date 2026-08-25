import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';

export const metadata: Metadata = { title: 'Übungen' };

export default function ExercisesPage() {
  return (
    <>
      <TopBar title="Übungen" />
      <ExerciseLibrary />
    </>
  );
}
