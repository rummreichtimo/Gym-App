import { prisma } from '@/server/db';
import { createVerificationCode } from '@/server/auth';
import { ok, parseBody, withErrorHandling } from '@/server/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { isEmailEnabled, sendVerificationEmail } from '@/server/email';

export const POST = withErrorHandling(async (request) => {
  const { email } = await parseBody(request, forgotPasswordSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: { select: { name: true } } },
  });

  // Answer identically whether or not the account exists, so this cannot be
  // used to find out which addresses are registered.
  const generic = { message: 'Falls ein Konto existiert, ist ein neuer Code unterwegs.' };

  if (!user || user.emailVerifiedAt || !isEmailEnabled()) return ok(generic);

  const code = await createVerificationCode(user.id);
  await sendVerificationEmail({
    to: email,
    name: user.profile?.name ?? 'Athlet',
    code,
  });

  return ok(generic);
});
