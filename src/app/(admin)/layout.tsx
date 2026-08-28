import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { currentUserIsAdmin } from '@/server/admin';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Separate from the (app) group on purpose: that layout sends anyone without a
 * finished onboarding to the wizard, which would swallow the link from the
 * notification email. Administration is an operator view and must not depend on
 * having set up a training profile.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(await currentUserIsAdmin())) notFound();

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="lg:pl-64">{children}</div>
      <BottomNav />
    </div>
  );
}
