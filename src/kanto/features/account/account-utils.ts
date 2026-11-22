import { errorMessage, errorRequestId, isApiError } from '../../lib/api';

/** The `?suite=` query, accepted only as an in-app path. */
export function readSuite(search: string): string | null {
  const value = new URLSearchParams(search).get('suite');
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}

export interface ShownError {
  message: string;
  requestId: string | null;
}

/** Maps an Auth error to the one message the contract allows for it. */
export function describeAuthError(error: unknown): ShownError {
  if (isApiError(error)) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return { message: 'Adresse ou mot de passe incorrect.', requestId: null };
    }
    if (error.code === 'AUTH_UNAVAILABLE' || error.status === 503) {
      return {
        message: 'Le service de comptes est indisponible pour le moment.',
        requestId: errorRequestId(error),
      };
    }
  }
  return { message: errorMessage(error), requestId: errorRequestId(error) };
}

/** Field errors from a `VALIDATION_FAILED` body, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    result[detail.field] = detail.reason;
  }
  return result;
}

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export function passwordLength(password: string): number {
  return Array.from(password.normalize('NFKC')).length;
}
