import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { GoalsView } from '@/components/goals/GoalsView';

export const metadata: Metadata = { title: 'Ziele' };

export default function GoalsPage() {
  return (
    <>
      <TopBar title="Ziele" />
      <GoalsView />
    </>
  );
}
