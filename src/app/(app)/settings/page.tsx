import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { SettingsView } from '@/components/profile/SettingsView';

export const metadata: Metadata = { title: 'Einstellungen' };

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Einstellungen" backHref="/profile" />
      <SettingsView />
    </>
  );
}
