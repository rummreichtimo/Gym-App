import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { onboardingSchema } from '@/lib/validation';
import { getProfile } from '@/server/profile';
import { calculateMacroTargets } from '@/lib/fitness';
import { toDateKey } from '@/lib/utils';
import { createStarterPlan } from '@/server/starter-plan';

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, onboardingSchema);

  const age = input.birthDate
    ? Math.max(14, Math.floor((Date.now() - new Date(input.birthDate).getTime()) / 31_557_600_000))
    : 30;

  // Derive sensible macro targets unless the user set their own during onboarding.
  const derived = calculateMacroTargets({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age,
    gender: input.gender,
    activityLevel: input.activityLevel,
    goal: input.goal,
  });

  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      name: input.name,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      heightCm: input.heightCm,
      startWeightKg: input.weightKg,
      gender: input.gender,
      goal: input.goal,
      experience: input.experience,
      weeklyTarget: input.weeklyTarget,
      weightUnit: input.weightUnit,
      lengthUnit: input.lengthUnit,
      activityLevel: input.activityLevel,
      calorieTarget: input.calorieTarget ?? derived.calories,
      proteinTarget: input.proteinTarget ?? derived.protein,
      carbTarget: input.carbTarget ?? derived.carbs,
      fatTarget: input.fatTarget ?? derived.fat,
      onboardingCompleted: true,
    },
  });

  // The starting weight doubles as the first body measurement so the progress
  // charts have a data point from day one.
  await prisma.bodyMeasurement.upsert({
    where: { userId_date: { userId: user.id, date: toDateKey() } },
    create: { userId: user.id, date: toDateKey(), weightKg: input.weightKg },
    update: { weightKg: input.weightKg },
  });

  if (input.createStarterPlan !== false) {
    await createStarterPlan(user.id, input.weeklyTarget, input.experience);
  }

  return ok({ profile: await getProfile(user.id) });
});
