import 'server-only';

import { prisma } from './db';
import type { ProfileDto } from '@/types';
import { DEFAULT_MEALS } from '@/lib/constants';

type ProfileRecord = NonNullable<Awaited<ReturnType<typeof prisma.profile.findUnique>>>;

export function toProfileDto(profile: ProfileRecord, email: string): ProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
    heightCm: profile.heightCm,
    startWeightKg: profile.startWeightKg,
    gender: profile.gender,
    goal: profile.goal,
    activityLevel: profile.activityLevel,
    experience: profile.experience,
    weeklyTarget: profile.weeklyTarget,
    weightUnit: profile.weightUnit as 'kg' | 'lb',
    lengthUnit: profile.lengthUnit as 'cm' | 'in',
    language: profile.language,
    theme: profile.theme as 'dark' | 'light' | 'system',
    calorieTarget: profile.calorieTarget,
    proteinTarget: profile.proteinTarget,
    carbTarget: profile.carbTarget,
    fatTarget: profile.fatTarget,
    defaultRestSec: profile.defaultRestSec,
    soundEnabled: profile.soundEnabled,
    notificationsOn: profile.notificationsOn,
    activePlanId: profile.activePlanId,
    onboardingCompleted: profile.onboardingCompleted,
  };
}

/** Loads the profile, creating a default one if it is somehow missing. */
export async function getProfile(userId: string): Promise<ProfileDto> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true },
  });

  const profile =
    user.profile ??
    (await prisma.profile.create({
      data: { userId, name: user.email.split('@')[0] ?? 'Athlet' },
    }));

  return toProfileDto(profile, user.email);
}

export const DEFAULT_MEAL_NAMES = DEFAULT_MEALS;
