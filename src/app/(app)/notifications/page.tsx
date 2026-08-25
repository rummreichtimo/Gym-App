import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { NotificationsView } from '@/components/profile/NotificationsView';

export const metadata: Metadata = { title: 'Benachrichtigungen' };

export default function NotificationsPage() {
  return (
    <>
      <TopBar title="Benachrichtigungen" />
      <NotificationsView />
    </>
  );
}
