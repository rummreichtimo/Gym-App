import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { ProgressView } from '@/components/progress/ProgressView';

export const metadata: Metadata = { title: 'Körper & Fortschritt' };

export default function ProgressPage() {
  return (
    <>
      <TopBar title="Körper & Fortschritt" />
      <ProgressView />
    </>
  );
}
