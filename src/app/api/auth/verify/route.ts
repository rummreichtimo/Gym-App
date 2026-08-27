import { prisma } from '@/server/db';
import { createSession, verifyEmailCode } from '@/server/auth';
import { ApiError, ok, parseBody, withErrorHandling } from '@/server/api';
import { verifyEmailSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';

export const POST = withErrorHandling(async (request) => {
  const { email, code } = await parseBody(request, verifyEmailSchema);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError('Der Code ist ungültig.', 400, { code: ['Der Code ist ungültig.'] });
  }

  if (user.emailVerifiedAt) {
    // Already confirmed - just sign them in rather than showing an error.
    await createSession(user.id);
    return ok({ profile: await getProfile(user.id) });
  }

  const result = await verifyEmailCode(user.id, code);

  if (result.status === 'expired') {
    throw new ApiError('Der Code ist abgelaufen. Fordere einen neuen an.', 400, {
      code: ['Der Code ist abgelaufen. Fordere einen neuen an.'],
    });
  }
  if (result.status === 'too_many_attempts') {
    throw new ApiError('Zu viele Fehlversuche. Fordere einen neuen Code an.', 429, {
      code: ['Zu viele Fehlversuche. Fordere einen neuen Code an.'],
    });
  }
  if (result.status === 'invalid') {
    throw new ApiError('Der Code ist ungültig.', 400, { code: ['Der Code ist ungültig.'] });
  }

  await createSession(user.id);
  return ok({ profile: await getProfile(user.id) });
});
