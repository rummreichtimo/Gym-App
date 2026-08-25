import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { HistoryView } from '@/components/history/HistoryView';

export const metadata: Metadata = { title: 'Trainingshistorie' };

export default function HistoryPage() {
  return (
    <>
      <TopBar title="Trainingshistorie" />
      <HistoryView />
    </>
  );
}
