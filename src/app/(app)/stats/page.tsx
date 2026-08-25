import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { StatsView } from '@/components/progress/StatsView';

export const metadata: Metadata = { title: 'Statistiken' };

export default function StatsPage() {
  return (
    <>
      <TopBar title="Statistiken" />
      <StatsView />
    </>
  );
}
