import { prisma } from '@/server/db';
import { createSession, verifyPassword } from '@/server/auth';
import { ApiError, ok, parseBody, withErrorHandling } from '@/server/api';
import { loginSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';

export const POST = withErrorHandling(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password - no account enumeration.
  const invalid = new ApiError('E-Mail-Adresse oder Passwort ist falsch.', 401);
  if (!user) throw invalid;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw invalid;

  await createSession(user.id);
  return ok({ profile: await getProfile(user.id) });
});
