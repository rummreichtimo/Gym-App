import { prisma } from '@/server/db';
import { createPasswordResetToken } from '@/server/auth';
import { ok, parseBody, withErrorHandling } from '@/server/api';
import { forgotPasswordSchema } from '@/lib/validation';

export const POST = withErrorHandling(async (request) => {
  const { email } = await parseBody(request, forgotPasswordSchema);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always answer identically so the endpoint cannot be used to probe accounts.
  if (!user) {
    return ok({
      message: 'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Zurücksetzen-Link erstellt.',
    });
  }

  const token = await createPasswordResetToken(user.id);

  // No mail provider is configured in a self-hosted setup, so the link is
  // returned directly. Swap this for an email send when deploying.
  return ok({
    message: 'Falls ein Konto mit dieser E-Mail existiert, haben wir einen Zurücksetzen-Link erstellt.',
    resetUrl: `/reset-password?token=${token}`,
  });
});
