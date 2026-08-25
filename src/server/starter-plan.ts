import 'server-only';

import { prisma } from './db';

interface TemplateExercise {
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
}

interface TemplateDay {
  name: string;
  weekday: number | null;
  exercises: TemplateExercise[];
}

interface PlanTemplate {
  name: string;
  description: string;
  days: TemplateDay[];
}

const FULL_BODY: PlanTemplate = {
  name: 'Ganzkörper 3er-Split',
  description: 'Drei Ganzkörpereinheiten pro Woche - ideal für den Einstieg und schnelle Fortschritte.',
  days: [
    {
      name: 'Ganzkörper A',
      weekday: 1,
      exercises: [
        { name: 'Kniebeugen', sets: 3, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Bankdrücken', sets: 3, repMin: 6, repMax: 10, restSec: 150 },
        { name: 'Langhantelrudern', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Kurzhantel-Schulterdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
        { name: 'Plank', sets: 3, repMin: 1, repMax: 1, restSec: 60 },
      ],
    },
    {
      name: 'Ganzkörper B',
      weekday: 3,
      exercises: [
        { name: 'Rumänisches Kreuzheben', sets: 3, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Latzug', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Kurzhantel-Schrägbankdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Beinpresse', sets: 3, repMin: 10, repMax: 15, restSec: 120 },
        { name: 'Seitheben', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
      ],
    },
    {
      name: 'Ganzkörper C',
      weekday: 5,
      exercises: [
        { name: 'Kreuzheben', sets: 3, repMin: 4, repMax: 6, restSec: 210 },
        { name: 'Schulterdrücken', sets: 3, repMin: 6, repMax: 10, restSec: 150 },
        { name: 'Klimmzüge', sets: 3, repMin: 5, repMax: 10, restSec: 120 },
        { name: 'Ausfallschritte', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { name: 'Kurzhantel-Curls', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
      ],
    },
  ],
};

const UPPER_LOWER: PlanTemplate = {
  name: 'Upper / Lower',
  description: 'Vier Einheiten pro Woche im Wechsel zwischen Oberkörper und Unterkörper.',
  days: [
    {
      name: 'Upper A',
      weekday: 1,
      exercises: [
        { name: 'Bankdrücken', sets: 4, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Langhantelrudern', sets: 4, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Kurzhantel-Schulterdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Latzug', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { name: 'Kurzhantel-Curls', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
        { name: 'Trizepsdrücken am Kabel', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      ],
    },
    {
      name: 'Lower A',
      weekday: 2,
      exercises: [
        { name: 'Kniebeugen', sets: 4, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Rumänisches Kreuzheben', sets: 3, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Beinpresse', sets: 3, repMin: 10, repMax: 15, restSec: 120 },
        { name: 'Beincurls liegend', sets: 3, repMin: 10, repMax: 15, restSec: 90 },
        { name: 'Wadenheben stehend', sets: 4, repMin: 12, repMax: 20, restSec: 60 },
      ],
    },
    {
      name: 'Upper B',
      weekday: 4,
      exercises: [
        { name: 'Schulterdrücken', sets: 4, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Klimmzüge', sets: 4, repMin: 5, repMax: 10, restSec: 150 },
        { name: 'Kurzhantel-Schrägbankdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Kabelrudern sitzend', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { name: 'Seitheben', sets: 4, repMin: 12, repMax: 15, restSec: 60 },
        { name: 'Face Pull', sets: 3, repMin: 12, repMax: 20, restSec: 60 },
      ],
    },
    {
      name: 'Lower B',
      weekday: 5,
      exercises: [
        { name: 'Kreuzheben', sets: 4, repMin: 4, repMax: 6, restSec: 210 },
        { name: 'Bulgarian Split Squat', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Hip Thrust', sets: 3, repMin: 10, repMax: 15, restSec: 120 },
        { name: 'Beinstrecker', sets: 3, repMin: 12, repMax: 15, restSec: 90 },
        { name: 'Wadenheben sitzend', sets: 4, repMin: 12, repMax: 20, restSec: 60 },
      ],
    },
  ],
};

const PPL: PlanTemplate = {
  name: 'Push / Pull / Legs',
  description: 'Der Klassiker für 5–6 Einheiten pro Woche mit hohem Volumen pro Muskelgruppe.',
  days: [
    {
      name: 'Push',
      weekday: 1,
      exercises: [
        { name: 'Bankdrücken', sets: 4, repMin: 6, repMax: 10, restSec: 180 },
        { name: 'Schrägbankdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Schulterdrücken', sets: 3, repMin: 8, repMax: 10, restSec: 120 },
        { name: 'Seitheben', sets: 4, repMin: 12, repMax: 15, restSec: 60 },
        { name: 'Trizepsdrücken am Kabel', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
        { name: 'Overhead Trizepsdrücken', sets: 3, repMin: 10, repMax: 15, restSec: 60 },
      ],
    },
    {
      name: 'Pull',
      weekday: 2,
      exercises: [
        { name: 'Klimmzüge', sets: 4, repMin: 5, repMax: 10, restSec: 180 },
        { name: 'Langhantelrudern', sets: 4, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Kabelrudern sitzend', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { name: 'Face Pull', sets: 3, repMin: 12, repMax: 20, restSec: 60 },
        { name: 'Kurzhantel-Curls', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
        { name: 'Hammer Curls', sets: 3, repMin: 10, repMax: 12, restSec: 60 },
      ],
    },
    {
      name: 'Legs',
      weekday: 3,
      exercises: [
        { name: 'Kniebeugen', sets: 4, repMin: 6, repMax: 10, restSec: 210 },
        { name: 'Rumänisches Kreuzheben', sets: 3, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Beinpresse', sets: 3, repMin: 10, repMax: 15, restSec: 120 },
        { name: 'Beincurls liegend', sets: 3, repMin: 10, repMax: 15, restSec: 90 },
        { name: 'Wadenheben stehend', sets: 4, repMin: 12, repMax: 20, restSec: 60 },
        { name: 'Plank', sets: 3, repMin: 1, repMax: 1, restSec: 60 },
      ],
    },
    {
      name: 'Push B',
      weekday: 5,
      exercises: [
        { name: 'Kurzhantel-Schrägbankdrücken', sets: 4, repMin: 8, repMax: 12, restSec: 150 },
        { name: 'Kurzhantel-Schulterdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { name: 'Butterfly', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
        { name: 'Seitheben', sets: 4, repMin: 12, repMax: 20, restSec: 60 },
        { name: 'Enges Bankdrücken', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
      ],
    },
    {
      name: 'Pull B',
      weekday: 6,
      exercises: [
        { name: 'Kreuzheben', sets: 3, repMin: 4, repMax: 6, restSec: 210 },
        { name: 'Latzug', sets: 4, repMin: 10, repMax: 12, restSec: 120 },
        { name: 'Kurzhantelrudern', sets: 3, repMin: 10, repMax: 12, restSec: 90 },
        { name: 'Reverse Butterfly', sets: 3, repMin: 12, repMax: 20, restSec: 60 },
        { name: 'Kabel-Curls', sets: 3, repMin: 12, repMax: 15, restSec: 60 },
      ],
    },
  ],
};

function pickTemplate(weeklyTarget: number): PlanTemplate {
  if (weeklyTarget <= 3) return FULL_BODY;
  if (weeklyTarget === 4) return UPPER_LOWER;
  return PPL;
}

/**
 * Creates a ready-to-train plan matched to the user's weekly frequency and
 * activates it, so a new account is never staring at an empty dashboard.
 * Set counts are trimmed for beginners.
 */
export async function createStarterPlan(
  userId: string,
  weeklyTarget: number,
  experience: string,
): Promise<string | null> {
  const template = pickTemplate(weeklyTarget);
  const setAdjustment = experience === 'beginner' ? -1 : 0;

  const library = await prisma.exercise.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: { id: true, name: true },
  });
  const byName = new Map(library.map((exercise) => [exercise.name, exercise.id]));

  const plan = await prisma.workoutPlan.create({
    data: { userId, name: template.name, description: template.description },
  });

  for (const [dayIndex, day] of template.days.entries()) {
    const created = await prisma.workoutDay.create({
      data: { planId: plan.id, name: day.name, order: dayIndex, weekday: day.weekday },
    });

    const rows = day.exercises
      .map((exercise, order) => {
        const exerciseId = byName.get(exercise.name);
        if (!exerciseId) return null;
        return {
          dayId: created.id,
          exerciseId,
          order,
          targetSets: Math.max(2, exercise.sets + setAdjustment),
          repMin: exercise.repMin,
          repMax: exercise.repMax,
          restSec: exercise.restSec,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) await prisma.planExercise.createMany({ data: rows });
  }

  await prisma.profile.update({ where: { userId }, data: { activePlanId: plan.id } });
  return plan.id;
}
