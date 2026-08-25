import { destroySession } from '@/server/auth';
import { ok, withErrorHandling } from '@/server/api';

export const POST = withErrorHandling(async () => {
  await destroySession();
  return ok({ success: true });
});
