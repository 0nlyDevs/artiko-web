import type { ApiClient, ApiMode } from './client';
import { createGatewayClient } from './gateway/gateway-client';
import { createMockClient } from './mock/mock-client';

/*
 * `NEXT_PUBLIC_API_MODE=gateway` talks to the gateway on the same origin. Anything else runs the in-browser mock, which is the hackathon
 * default: no gateway, Auth or Content service exists yet.
 */
export const apiMode: ApiMode =
  process.env.NEXT_PUBLIC_API_MODE === 'gateway' ? 'gateway' : 'mock';

export const isMockApi = apiMode === 'mock';

export const api: ApiClient =
  apiMode === 'gateway' ? createGatewayClient() : createMockClient();

/**
 * Resets the demo content. Only meaningful in mock mode. `keepSession` keeps
 * the current demo account signed in.
 */
export function resetDemoData(options: { keepSession?: boolean } = {}): void {
  if ('reset' in api && typeof api.reset === 'function') {
    (api as { reset: (options: { keepSession?: boolean }) => void }).reset(
      options,
    );
  }
}

export { ApiError, errorMessage, errorRequestId, isApiError } from './errors';
export { useAsync } from './use-async';
export type { AsyncState } from './use-async';
export type * from './types';
