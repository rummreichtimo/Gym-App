import 'server-only';

import { prisma } from './db';
import { getCurrentUser } from './auth';
import { adminEmail } from './email';

/**
 * Administration is tied to the single address in ADMIN_EMAIL. With that
 * variable unset nobody is an administrator, so a deployment without it simply
 * has no admin area rather than an unguarded one.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const configured = adminEmail();
  if (!configured || !email) return false;
  return configured.trim().toLowerCase() === email.trim().toLowerCase();
}

export async function currentUserIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminEmail(user?.email);
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  verified: boolean;
  lastSeenAt: string | null;
  workouts: number;
  workoutsLast30Days: number;
  lastWorkoutAt: string | null;
  totalVolume: number;
  isAdmin: boolean;
}

export interface AdminOverview {
  users: AdminUserRow[];
  totals: {
    users: number;
    verified: number;
    newLast7Days: number;
    activeLast30Days: number;
  };
}

/**
 * One aggregated read for the admin table. Counts are gathered with groupBy
 * rather than per user, so the number of queries stays constant as the user
 * list grows.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const now = Date.now();
  const since30 = new Date(now - 30 * 86_400_000);
  const since7 = new Date(now - 7 * 86_400_000);

  const [users, workoutStats, recentStats, lastWorkouts, lastSessions] = await Promise.all([
    prisma.user.findMany({
      include: { profile: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workoutSession.groupBy({
      by: ['userId'],
      where: { status: 'completed' },
      _count: { _all: true },
      _sum: { totalVolume: true },
    }),
    prisma.workoutSession.groupBy({
      by: ['userId'],
      where: { status: 'completed', startedAt: { gte: since30 } },
      _count: { _all: true },
    }),
    prisma.workoutSession.groupBy({
      by: ['userId'],
      where: { status: 'completed' },
      _max: { startedAt: true },
    }),
    // Newest session per user - the closest thing to "last signed in".
    prisma.session.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
    }),
  ]);

  const totalByUser = new Map(workoutStats.map((row) => [row.userId, row]));
  const recentByUser = new Map(recentStats.map((row) => [row.userId, row._count._all]));
  const lastWorkoutByUser = new Map(lastWorkouts.map((row) => [row.userId, row._max.startedAt]));
  const lastSeenByUser = new Map(lastSessions.map((row) => [row.userId, row._max.createdAt]));

  const rows: AdminUserRow[] = users.map((user) => {
    const totals = totalByUser.get(user.id);
    const lastSeen = lastSeenByUser.get(user.id) ?? null;
    return {
      id: user.id,
      name: user.profile?.name ?? '—',
      email: user.email,
      registeredAt: user.createdAt.toISOString(),
      verified: user.emailVerifiedAt !== null,
      lastSeenAt: lastSeen ? lastSeen.toISOString() : null,
      workouts: totals?._count._all ?? 0,
      workoutsLast30Days: recentByUser.get(user.id) ?? 0,
      lastWorkoutAt: lastWorkoutByUser.get(user.id)?.toISOString() ?? null,
      totalVolume: Math.round(totals?._sum.totalVolume ?? 0),
      isAdmin: isAdminEmail(user.email),
    };
  });

  return {
    users: rows,
    totals: {
      users: rows.length,
      verified: rows.filter((row) => row.verified).length,
      newLast7Days: users.filter((user) => user.createdAt >= since7).length,
      activeLast30Days: rows.filter((row) => row.workoutsLast30Days > 0).length,
    },
  };
}
