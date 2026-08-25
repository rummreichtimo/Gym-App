import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { PlanList } from '@/components/plans/PlanList';

export const metadata: Metadata = { title: 'Trainingspläne' };

export default function PlansPage() {
  return (
    <>
      <TopBar title="Trainingspläne" />
      <PlanList />
    </>
  );
}
