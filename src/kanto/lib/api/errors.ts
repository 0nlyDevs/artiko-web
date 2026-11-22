import type { PublicError } from './types';

/** An error returned by the gateway or the mock, with the frozen public shape. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly details: readonly { field: string; reason: string }[];

  constructor(status: number, body: Partial<PublicError>, fallback: string) {
    super(body.message ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.requestId = body.requestId ?? '';
    this.details = body.details ?? [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** A message safe to show: the public message, never an internal detail. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'Connexion perdue. Vérifiez votre réseau puis réessayez.';
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

export function errorRequestId(error: unknown): string | null {
  return isApiError(error) && error.requestId !== '' ? error.requestId : null;
}
