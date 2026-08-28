import { prisma } from '@/server/db';
import { createVerificationCode } from '@/server/auth';
import { ok, parseBody, withErrorHandling } from '@/server/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { isEmailEnabled, sendVerificationEmail } from '@/server/email';

/** Minimum spacing between two codes for the same account. */
const RESEND_COOLDOWN_SECONDS = 30;

export const POST = withErrorHandling(async (request) => {
  const { email } = await parseBody(request, forgotPasswordSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: { select: { name: true } } },
  });

  // Every branch answers the same shape - status, message and a cooldown - so
  // the response never reveals whether an account exists. A client-side timer
  // alone would not do: a reload resets it and the API can be called directly.
  const respond = (retryAfter: number) =>
    ok({
      message: 'Falls ein Konto existiert, ist ein neuer Code unterwegs.',
      retryAfter,
    });

  if (!user || user.emailVerifiedAt || !isEmailEnabled()) {
    return respond(RESEND_COOLDOWN_SECONDS);
  }

  const lastCode = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (lastCode) {
    const elapsed = (Date.now() - lastCode.createdAt.getTime()) / 1000;
    const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
    // Too soon - send nothing, but report how long is left.
    if (remaining > 0) return respond(remaining);
  }

  const code = await createVerificationCode(user.id);
  await sendVerificationEmail({
    to: email,
    name: user.profile?.name ?? 'Athlet',
    code,
  });

  return respond(RESEND_COOLDOWN_SECONDS);
});
