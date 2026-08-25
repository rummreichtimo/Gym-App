import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { prisma } from '@/server/db';
import { OnboardingWizard } from './wizard';

export const metadata: Metadata = { title: 'Los geht’s' };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (profile?.onboardingCompleted) redirect('/dashboard');

  return <OnboardingWizard defaultName={profile?.name ?? ''} />;
}
