import { prisma } from '@/server/db';
import { hashPassword, verifyPassword } from '@/server/auth';
import { ApiError, ok, parseBody, withUser } from '@/server/api';
import { changePasswordSchema } from '@/lib/validation';

export const POST = withUser(async (user, request) => {
  const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema);

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    throw new ApiError('Das aktuelle Passwort ist falsch.', 400, {
      currentPassword: ['Das aktuelle Passwort ist falsch.'],
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return ok({ success: true });
});
