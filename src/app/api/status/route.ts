import { prisma } from '@/server/db';
import { ok, withErrorHandling } from '@/server/api';
import { adminEmail, emailProvider, isEmailEnabled, missingEmailVars } from '@/server/email';

export const dynamic = 'force-dynamic';

/**
 * Deployment self-check. Reports only booleans and counts - never a key, an
 * address or any user content - so it is safe to call without a session.
 *
 * Exists because email verification silently stays off when the mail provider
 * is not configured, and there was otherwise no way to tell from the outside
 * whether a deployment picked its variables up.
 */
export const GET = withErrorHandling(async () => {
  let database: 'ok' | 'unreachable' = 'ok';
  let exercises = 0;
  let foods = 0;

  try {
    [exercises, foods] = await Promise.all([
      prisma.exercise.count({ where: { userId: null } }),
      prisma.food.count({ where: { userId: null } }),
    ]);
  } catch {
    database = 'unreachable';
  }

  const emailConfigured = isEmailEnabled();

  return ok({
    database,
    seed: {
      exercises,
      foods,
      // The build seeds these; zero means the seed step never ran.
      complete: exercises > 0 && foods > 0,
    },
    email: {
      configured: emailConfigured,
      // 'smtp' reaches any recipient; 'resend' only does once its sending
      // domain is verified.
      provider: emailProvider(),
      // Which variables are missing, without revealing any value.
      missing: emailConfigured ? [] : missingEmailVars(),
      adminNotifications: Boolean(adminEmail()) && emailConfigured,
      adminEmailSet: Boolean(adminEmail()),
    },
    // The headline answer: does a new account have to confirm its address?
    verificationRequired: emailConfigured,
  });
});
