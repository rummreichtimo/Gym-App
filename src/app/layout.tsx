import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { getCurrentUser } from '@/server/auth';
import { getProfile } from '@/server/profile';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import type { ProfileDto } from '@/types';

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – Training & Ernährung`, template: `%s · ${APP_NAME}` },
  description:
    'IronPath ist deine App für Trainingspläne, Workout-Tracking, Ernährung und Fortschritt.',
  applicationName: APP_NAME,
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: APP_NAME },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#090b10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  let profile: ProfileDto | null = null;
  if (user) {
    try {
      profile = await getProfile(user.id);
    } catch {
      profile = null;
    }
  }

  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <span className="sr-only">{APP_TAGLINE}</span>
        <Providers initialProfile={profile}>{children}</Providers>
      </body>
    </html>
  );
}
