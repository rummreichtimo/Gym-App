import { prisma } from '@/server/db';
import { consumePasswordResetToken, hashPassword } from '@/server/auth';
import { ApiError, ok, parseBody, withErrorHandling } from '@/server/api';
import { resetPasswordSchema } from '@/lib/validation';

export const POST = withErrorHandling(async (request) => {
  const { token, password } = await parseBody(request, resetPasswordSchema);

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    throw new ApiError('Der Link ist ungültig oder abgelaufen. Fordere einen neuen an.', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  // Invalidate every existing session after a password change.
  await prisma.session.deleteMany({ where: { userId } });

  return ok({ success: true });
});
