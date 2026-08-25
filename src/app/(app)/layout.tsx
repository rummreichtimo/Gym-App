import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { prisma } from '@/server/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { ActiveWorkoutBar } from '@/components/workout/ActiveWorkoutBar';

/**
 * Shell for every authenticated page. Redirects to login when signed out and
 * to onboarding until the profile is set up.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { onboardingCompleted: true },
  });
  if (!profile?.onboardingCompleted) redirect('/onboarding');

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="lg:pl-64">{children}</div>
      <ActiveWorkoutBar />
      <BottomNav />
    </div>
  );
}
