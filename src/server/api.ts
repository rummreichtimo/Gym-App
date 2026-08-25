import 'server-only';

import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { requireUser, UnauthorizedError, type AuthUser } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Nicht gefunden') {
    super(message, 404);
  }
}

export function jsonError(message: string, status = 400, details?: Record<string, string[]>) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Translates any thrown error into a safe, user-readable JSON response. */
export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return jsonError('Bitte melde dich an, um fortzufahren.', 401);
  }
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status, error.details);
  }
  if (error instanceof ZodError) {
    return jsonError('Bitte überprüfe deine Eingaben.', 422, fieldErrors(error));
  }
  console.error('[api] Unhandled error:', error);
  return jsonError('Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.', 500);
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

/**
 * Wraps a route handler: guarantees authentication, JSON error handling and a
 * typed `user` argument, so no handler can accidentally run unauthenticated.
 */
export function withUser<Ctx = unknown>(
  handler: (user: AuthUser, request: Request, context: Ctx) => Promise<Response>,
) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      const user = await requireUser();
      return await handler(user, request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

/** Same as `withUser` but for public routes (login, register, ...). */
export function withErrorHandling<Ctx = unknown>(
  handler: (request: Request, context: Ctx) => Promise<Response>,
) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError('Ungültige Anfrage: Der Datensatz konnte nicht gelesen werden.', 400);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError('Bitte überprüfe deine Eingaben.', 422, fieldErrors(result.error));
  }
  return result.data;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError('Ungültige Filterparameter.', 422, fieldErrors(result.error));
  }
  return result.data;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
