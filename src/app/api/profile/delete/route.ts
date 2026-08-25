import { prisma } from '@/server/db';
import { ApiError, ok, parseBody, withUser } from '@/server/api';
import { destroySession, verifyPassword } from '@/server/auth';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
  confirm: z.literal('LÖSCHEN', {
    message: 'Bitte tippe LÖSCHEN, um den Vorgang zu bestätigen.',
  }),
});

/** Irreversible account deletion. Cascades remove every related row. */
export const POST = withUser(async (user, request) => {
  const { password } = await parseBody(request, schema);

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, record.passwordHash))) {
    throw new ApiError('Das Passwort ist falsch.', 400, {
      password: ['Das Passwort ist falsch.'],
    });
  }

  await destroySession();
  await prisma.user.delete({ where: { id: user.id } });

  return ok({ success: true });
});
