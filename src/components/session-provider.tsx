'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ProfileDto } from '@/types';

interface SessionContextValue {
  profile: ProfileDto | null;
  isAuthenticated: boolean;
  setProfile: (profile: ProfileDto | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the signed-in profile client-side. Seeded from the server on first
 * render so there is no flash of unauthenticated UI, and kept in sync whenever
 * settings change.
 */
export function SessionProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile: ProfileDto | null;
}) {
  const [profile, setProfile] = useState<ProfileDto | null>(initialProfile);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Apply the user's theme choice to the document root.
  useEffect(() => {
    const root = document.documentElement;
    const theme = profile?.theme ?? 'dark';
    const prefersLight =
      theme === 'system' && typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
        : false;
    root.classList.toggle('light', theme === 'light' || prefersLight);
  }, [profile?.theme]);

  const refresh = useCallback(async () => {
    const data = await api.get<{ profile: ProfileDto | null }>('/api/auth/me');
    setProfile(data.profile);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setProfile(null);
    queryClient.clear();
    router.replace('/login');
    router.refresh();
  }, [queryClient, router]);

  const value = useMemo<SessionContextValue>(
    () => ({ profile, isAuthenticated: profile !== null, setProfile, refresh, logout }),
    [profile, refresh, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a SessionProvider');
  return context;
}

/** Convenience accessor - throws only where a profile is guaranteed. */
export function useProfile(): ProfileDto {
  const { profile } = useSession();
  if (!profile) throw new Error('useProfile requires an authenticated session');
  return profile;
}
