import { prisma } from '@/server/db';
import { withUser } from '@/server/api';
import { toDateKey } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Full data export as JSON or CSV. Only ever returns the requesting user's own
 * rows - nothing here is shared between accounts.
 */
export const GET = withUser(async (user, request) => {
  const format = new URL(request.url).searchParams.get('format') ?? 'json';

  const [profile, sessions, measurements, meals, goals, records] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: 'completed' },
      include: {
        exercises: { include: { exercise: { select: { name: true } }, sets: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.bodyMeasurement.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } }),
    prisma.meal.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { date: 'asc' },
    }),
    prisma.goal.findMany({ where: { userId: user.id } }),
    prisma.personalRecord.findMany({
      where: { userId: user.id },
      include: { exercise: { select: { name: true } } },
    }),
  ]);

  const filenameBase = `ironpath-export-${toDateKey()}`;

  if (format === 'csv') {
    const rows: string[][] = [
      ['Datum', 'Workout', 'Übung', 'Satz', 'Gewicht (kg)', 'Wiederholungen', 'RIR', 'Aufwärmsatz'],
    ];
    for (const session of sessions) {
      for (const entry of session.exercises) {
        for (const set of entry.sets) {
          rows.push([
            toDateKey(session.startedAt),
            session.name,
            entry.exercise.name,
            String(set.setNumber),
            String(set.weightKg),
            String(set.reps),
            set.rir === null ? '' : String(set.rir),
            set.isWarmup ? 'ja' : 'nein',
          ]);
        }
      }
    }

    const csv = rows.map((row) => row.map(escapeCsv).join(';')).join('\n');
    return new Response(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}-training.csv"`,
      },
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'IronPath',
    account: { email: user.email },
    profile,
    workouts: sessions.map((session) => ({
      date: session.startedAt.toISOString(),
      name: session.name,
      durationSec: session.durationSec,
      totalVolume: session.totalVolume,
      notes: session.notes,
      exercises: session.exercises.map((entry) => ({
        name: entry.exercise.name,
        notes: entry.notes,
        sets: entry.sets.map((set) => ({
          setNumber: set.setNumber,
          weightKg: set.weightKg,
          reps: set.reps,
          rir: set.rir,
          rpe: set.rpe,
          isWarmup: set.isWarmup,
        })),
      })),
    })),
    personalRecords: records.map((record) => ({
      exercise: record.exercise.name,
      type: record.type,
      value: record.value,
      weightKg: record.weightKg,
      reps: record.reps,
      achievedAt: record.achievedAt.toISOString(),
    })),
    bodyMeasurements: measurements,
    nutrition: meals.map((meal) => ({
      date: meal.date,
      name: meal.name,
      items: meal.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    })),
    goals,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
    },
  });
});

function escapeCsv(value: string) {
  if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
