import { prisma } from '@/server/db';
import { createSession, createVerificationCode, hashPassword } from '@/server/auth';
import { ApiError, ok, parseBody, withErrorHandling } from '@/server/api';
import { registerSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';
import { adminEmail, isEmailEnabled, sendNewUserNotification, sendVerificationEmail } from '@/server/email';

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
      // Without a configured mail provider there is no way to confirm an
      // address, so the account is usable immediately instead of unreachable.
      emailVerifiedAt: isEmailEnabled() ? null : new Date(),
      profile: { create: { name } },
    },
  });

  // Let the owner know a new account appeared. Never block registration on it.
  const admin = adminEmail();
  if (admin && isEmailEnabled()) {
    const totalUsers = await prisma.user.count();
    void sendNewUserNotification({
      to: admin,
      userName: name,
      userEmail: email,
      totalUsers,
    });
  }

  if (!isEmailEnabled()) {
    await createSession(user.id);
    return ok({ verificationRequired: false, profile: await getProfile(user.id) }, 201);
  }

  const code = await createVerificationCode(user.id);
  const result = await sendVerificationEmail({ to: email, name, code });

  if (!result.ok) {
    // The account exists but the code never arrived - remove it so the address
    // stays free and the user can simply try again.
    await prisma.user.delete({ where: { id: user.id } });
    throw new ApiError(
      'Die Bestätigungs-E-Mail konnte nicht versendet werden. Bitte versuche es später erneut.',
      502,
    );
  }

  // No session yet: the address has to be confirmed first.
  return ok({ verificationRequired: true, email }, 201);
});
