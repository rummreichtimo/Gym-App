import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { ProfileView } from '@/components/profile/ProfileView';

export const metadata: Metadata = { title: 'Profil' };

export default function ProfilePage() {
  return (
    <>
      <TopBar title="Profil" />
      <ProfileView />
    </>
  );
}
