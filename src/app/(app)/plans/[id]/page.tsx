import type { Metadata } from 'next';
import { PlanEditor } from '@/components/plans/PlanEditor';

export const metadata: Metadata = { title: 'Trainingsplan' };

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanEditor planId={id} />;
}
