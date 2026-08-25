import { prisma } from '@/server/db';
import { NotFoundError, ok, parseBody, withUser } from '@/server/api';
import { reminderSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export const PATCH = withUser<Context>(async (user, request, { params }) => {
  const { id } = await params;
  const existing = await prisma.reminder.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Erinnerung existiert nicht.');

  const input = await parseBody(request, reminderSchema.partial());

  const reminder = await prisma.reminder.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.time !== undefined ? { time: input.time } : {}),
      ...(input.weekdays !== undefined ? { weekdays: input.weekdays.join(',') } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    },
  });

  return ok({
    reminder: {
      id: reminder.id,
      type: reminder.type,
      title: reminder.title,
      time: reminder.time,
      weekdays: reminder.weekdays ? reminder.weekdays.split(',').filter(Boolean).map(Number) : [],
      enabled: reminder.enabled,
    },
  });
});

export const DELETE = withUser<Context>(async (user, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.reminder.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new NotFoundError('Diese Erinnerung existiert nicht.');

  await prisma.reminder.delete({ where: { id } });
  return ok({ success: true });
});
