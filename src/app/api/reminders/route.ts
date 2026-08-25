import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { reminderSchema } from '@/lib/validation';
import type { ReminderDto } from '@/types';

export const dynamic = 'force-dynamic';

function toDto(reminder: {
  id: string; type: string; title: string; time: string; weekdays: string; enabled: boolean;
}): ReminderDto {
  return {
    id: reminder.id,
    type: reminder.type,
    title: reminder.title,
    time: reminder.time,
    weekdays: reminder.weekdays ? reminder.weekdays.split(',').filter(Boolean).map(Number) : [],
    enabled: reminder.enabled,
  };
}

export const GET = withUser(async (user) => {
  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { time: 'asc' },
  });
  return ok({ reminders: reminders.map(toDto) });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, reminderSchema);

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      type: input.type,
      title: input.title,
      time: input.time,
      weekdays: input.weekdays.join(','),
      enabled: input.enabled,
    },
  });

  return ok({ reminder: toDto(reminder) }, 201);
});
