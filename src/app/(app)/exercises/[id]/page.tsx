import type { Metadata } from 'next';
import { ExerciseDetail } from '@/components/exercises/ExerciseDetail';

export const metadata: Metadata = { title: 'Übung' };

export default async function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExerciseDetail exerciseId={id} />;
}
