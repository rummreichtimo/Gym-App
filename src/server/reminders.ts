import 'server-only';

import { prisma } from './db';
import { notify } from './notifications';
import { toDateKey } from '@/lib/utils';

/**
 * Evaluates the user's reminders and pushes due ones into the in-app inbox.
 * Runs whenever the dashboard is loaded, which keeps everything server-side and
 * works without a background job runner. Each reminder fires at most once a day
 * (tracked via `lastFired`).
 */
export async function runReminderChecks(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { notificationsOn: true, weeklyTarget: true },
  });
  if (!profile?.notificationsOn) return;

  const now = new Date();
  const todayKey = toDateKey(now);
  const weekday = now.getDay();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const reminders = await prisma.reminder.findMany({ where: { userId, enabled: true } });

  for (const reminder of reminders) {
    if (reminder.lastFired === todayKey) continue;

    const days = reminder.weekdays
      ? reminder.weekdays.split(',').filter(Boolean).map(Number)
      : [];
    if (days.length > 0 && !days.includes(weekday)) continue;

    const [hours, minutes] = reminder.time.split(':').map(Number);
    if (minutesNow < hours * 60 + minutes) continue;

    await notify({
      userId,
      type: 'reminder',
      icon: 'bell',
      title: reminder.title,
      body: reminderBody(reminder.type),
      dedupeKey: `reminder:${reminder.id}:${todayKey}`,
    });
    await prisma.reminder.update({ where: { id: reminder.id }, data: { lastFired: todayKey } });
  }

  await checkTrainingGap(userId);
}

function reminderBody(type: string) {
  switch (type) {
    case 'workout':
      return 'Dein Training wartet. Los geht’s!';
    case 'weigh_in':
      return 'Trage dein aktuelles Gewicht ein, um deinen Verlauf aktuell zu halten.';
    case 'meal':
      return 'Vergiss nicht, deine Mahlzeiten zu tracken.';
    case 'protein':
      return 'Check kurz, ob du auf Kurs für dein Protein-Ziel bist.';
    default:
      return '';
  }
}

/** A friendly nudge after a longer break - no health claims, just a reminder. */
async function checkTrainingGap(userId: string) {
  const last = await prisma.workoutSession.findFirst({
    where: { userId, status: 'completed' },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });
  if (!last) return;

  const days = Math.floor((Date.now() - last.startedAt.getTime()) / 86_400_000);
  if (days < 7) return;

  await notify({
    userId,
    type: 'rest',
    icon: 'calendar',
    title: `Seit ${days} Tagen kein Training`,
    body: 'Ein kurzes, lockeres Workout ist ein guter Wiedereinstieg.',
    dedupeKey: `gap:${toDateKey()}`,
  });
}
