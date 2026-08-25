import { getCurrentUser } from '@/server/auth';
import { ok, withErrorHandling } from '@/server/api';
import { getProfile } from '@/server/profile';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return ok({ profile: null });
  return ok({ profile: await getProfile(user.id) });
});
