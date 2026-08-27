import 'server-only';

import { randomBytes, randomInt, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from './db';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'ironpath_session';
const SESSION_DAYS = 30;

// ---------------------------------------------------------------------------
// Password hashing (scrypt - built into Node, no native dependency needed)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== derived.length) return false;
  return timingSafeEqual(keyBuffer, derived);
}

// ---------------------------------------------------------------------------
// Sessions - random opaque token in an httpOnly cookie, only its hash is stored
// ---------------------------------------------------------------------------

function hashToken(token: string) {
  const secret = process.env.AUTH_SECRET ?? 'ironpath-dev-secret';
  return createHash('sha256').update(`${token}${secret}`).digest('hex');
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Resolves the signed-in user for the current request. Cached per request so
 * multiple components/handlers do not each hit the database.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Nicht angemeldet');
    this.name = 'UnauthorizedError';
  }
}

// ---------------------------------------------------------------------------
// Password reset tokens
// ---------------------------------------------------------------------------

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}

// ---------------------------------------------------------------------------
// Email verification codes
// ---------------------------------------------------------------------------

const CODE_TTL_MINUTES = 30;
const MAX_CODE_ATTEMPTS = 6;

/** Six digits, uniformly random - `randomInt` avoids modulo bias. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Issues a fresh verification code, replacing any earlier one so only the most
 * recently sent code is ever valid.
 */
export async function createVerificationCode(userId: string): Promise<string> {
  const code = generateCode();
  await prisma.emailVerificationCode.deleteMany({ where: { userId } });
  await prisma.emailVerificationCode.create({
    data: {
      codeHash: hashToken(code),
      userId,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
  });
  return code;
}

export type VerificationResult =
  | { status: 'ok' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'too_many_attempts' };

/**
 * Checks a submitted code and, on success, marks the address as verified.
 * Wrong guesses are counted so a six-digit code cannot be brute-forced.
 */
export async function verifyEmailCode(
  userId: string,
  code: string,
): Promise<VerificationResult> {
  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return { status: 'expired' };

  if (record.attempts >= MAX_CODE_ATTEMPTS) return { status: 'too_many_attempts' };

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationCode.deleteMany({ where: { userId } });
    return { status: 'expired' };
  }

  if (record.codeHash !== hashToken(code.trim())) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { status: 'invalid' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  await prisma.emailVerificationCode.deleteMany({ where: { userId } });
  return { status: 'ok' };
}
