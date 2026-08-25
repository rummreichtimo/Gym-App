import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { measurementSchema } from '@/lib/validation';
import { syncGoalProgress } from '@/server/goals';
import type { MeasurementDto } from '@/types';

export const dynamic = 'force-dynamic';

function toDto(record: {
  id: string; date: string; weightKg: number | null; bodyFat: number | null;
  chestCm: number | null; waistCm: number | null; hipCm: number | null;
  armCm: number | null; thighCm: number | null; calfCm: number | null; notes: string;
}): MeasurementDto {
  return { ...record };
}

export const GET = withUser(async (user, request) => {
  const from = new URL(request.url).searchParams.get('from');
  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId: user.id, ...(from ? { date: { gte: from } } : {}) },
    orderBy: { date: 'desc' },
  });
  return ok({ measurements: measurements.map(toDto) });
});

/** One measurement per day: re-submitting the same date updates it. */
export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, measurementSchema);

  const data = {
    weightKg: input.weightKg ?? null,
    bodyFat: input.bodyFat ?? null,
    chestCm: input.chestCm ?? null,
    waistCm: input.waistCm ?? null,
    hipCm: input.hipCm ?? null,
    armCm: input.armCm ?? null,
    thighCm: input.thighCm ?? null,
    calfCm: input.calfCm ?? null,
    notes: input.notes ?? '',
  };

  const measurement = await prisma.bodyMeasurement.upsert({
    where: { userId_date: { userId: user.id, date: input.date } },
    create: { userId: user.id, date: input.date, ...data },
    update: data,
  });

  await syncGoalProgress(user.id);
  return ok({ measurement: toDto(measurement) }, 201);
});
