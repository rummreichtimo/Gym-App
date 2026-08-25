import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { RecordsView } from '@/components/progress/RecordsView';

export const metadata: Metadata = { title: 'Persönliche Rekorde' };

export default function RecordsPage() {
  return (
    <>
      <TopBar title="Persönliche Rekorde" />
      <RecordsView />
    </>
  );
}
