import { prisma } from '@/server/db';
import { createSession, hashPassword } from '@/server/auth';
import { ApiError, ok, parseBody, withErrorHandling } from '@/server/api';
import { registerSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';

export const POST = withErrorHandling(async (request) => {
  const { name, email, password } = await parseBody(request, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError('Diese E-Mail-Adresse ist bereits registriert.', 409, {
      email: ['Diese E-Mail-Adresse ist bereits registriert.'],
    });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      profile: { create: { name } },
    },
  });

  await createSession(user.id);
  return ok({ profile: await getProfile(user.id) }, 201);
});
