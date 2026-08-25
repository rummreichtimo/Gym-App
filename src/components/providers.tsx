'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/session-provider';
import type { ProfileDto } from '@/types';

export function Providers({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile: ProfileDto | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Training data changes on user action, not in the background.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SessionProvider initialProfile={initialProfile}>{children}</SessionProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
