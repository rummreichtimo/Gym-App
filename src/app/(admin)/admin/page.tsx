import type { Metadata } from 'next';
import { TopBar } from '@/components/layout/TopBar';
import { AdminView } from '@/components/admin/AdminView';
import { currentUserIsAdmin } from '@/server/admin';

export const dynamic = 'force-dynamic';

/**
 * Next renders page metadata even when access is refused, so a static title
 * here would announce the admin area to anyone who guessed the URL.
 */
export async function generateMetadata(): Promise<Metadata> {
  return (await currentUserIsAdmin())
    ? { title: 'Nutzerübersicht' }
    : { title: 'Seite nicht gefunden' };
}

export default function AdminPage() {
  // Access is enforced in the layout, which runs before this renders.
  return (
    <>
      <TopBar title="Nutzerübersicht" backHref="/profile" />
      <AdminView />
    </>
  );
}
