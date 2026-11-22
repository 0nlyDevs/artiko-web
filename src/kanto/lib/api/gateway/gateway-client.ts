import type { ApiClient } from '../client';
import { ApiError } from '../errors';
import type {
  Account,
  Item,
  ItemListParams,
  Model3dDisplay,
  PublicError,
  ScanSession,
  UploadProgress,
} from '../types';

/*
 * HTTP implementation on the gateway. Frozen routes come from the Gate 0
 * contract; routes marked [PROPOSED] are additive proposals recorded in
 * docs/API-INTEGRATION.md and must be agreed before they exist server-side.
 * The session travels in the HttpOnly cookie set by the gateway (D07).
 */

function asPublicError(data: unknown): Partial<PublicError> {
  if (typeof data !== 'object' || data === null) {
    return {};
  }
  const body = data as Record<string, unknown>;
  const nested = body['error'];
  const source =
    typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : body;
  const details = Array.isArray(source['details'])
    ? (source['details'] as { field: string; reason: string }[])
    : undefined;
  const result: Partial<PublicError> = {};
  if (typeof source['code'] === 'string') {
    result.code = source['code'];
  }
  if (typeof source['message'] === 'string') {
    result.message = source['message'];
  }
  if (typeof source['requestId'] === 'string') {
    result.requestId = source['requestId'];
  }
  if (details !== undefined) {
    result.details = details;
  }
  return result;
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

export function createGatewayClient(base = ''): ApiClient {
  async function send(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<unknown> {
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers:
        body === undefined
          ? headers
          : { 'content-type': 'application/json', ...headers },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(`${base}${path}`, init);
    const text = await response.text();
    let data: unknown = null;
    if (text !== '') {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        asPublicError(data),
        `Le service a répondu ${String(response.status)}.`,
      );
    }
    return data;
  }

  function upload(
    method: string,
    path: string,
    form: FormData,
    onProgress: ((progress: UploadProgress) => void) | undefined,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open(method, `${base}${path}`);
      request.withCredentials = true;
      request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress?.({ loaded: event.loaded, total: event.total });
        }
      });
      request.addEventListener('load', () => {
        let data: unknown = null;
        try {
          data =
            request.responseText === ''
              ? null
              : JSON.parse(request.responseText);
        } catch {
          data = null;
        }
        if (request.status >= 200 && request.status < 300) {
          resolve(data);
        } else {
          reject(
            new ApiError(
              request.status,
              asPublicError(data),
              `L’envoi a échoué (${String(request.status)}).`,
            ),
          );
        }
      });
      request.addEventListener('error', () => {
        reject(new TypeError('network error'));
      });
      request.send(form);
    });
  }

  const get = (path: string) => send('GET', path);
  const post = (
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => send('POST', path, body, headers);

  return {
    mode: 'gateway',

    auth: {
      async register(input) {
        await post('/auth/register', input);
      },
      async login(input) {
        await post('/auth/login', input);
        return (await get('/auth/me')) as Account;
      },
      async logout() {
        await post('/auth/logout');
      },
      async me() {
        try {
          return (await get('/auth/me')) as Account;
        } catch (error) {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 503)
          ) {
            return null;
          }
          throw error;
        }
      },
    },

    items: {
      async list(params: ItemListParams = {}) {
        return (await get(
          `/api/items${query({
            owner: params.owner,
            status: params.status,
            medium: params.medium,
            q: params.query,
          })}`,
        )) as Item[];
      },
      async get(id) {
        return (await get(`/api/items/${encodeURIComponent(id)}`)) as Item;
      },
      async create(input) {
        return (await post('/api/items', input)) as Item;
      },
      async update(id, patch) {
        // [PROPOSED]
        return (await send(
          'PATCH',
          `/api/items/${encodeURIComponent(id)}`,
          patch,
        )) as Item;
      },
      async uploadMedia(id, file, options = {}) {
        const form = new FormData();
        form.set('file', file);
        if (options.kind !== undefined) {
          form.set('kind', options.kind);
        }
        return (await upload(
          'POST',
          `/api/items/${encodeURIComponent(id)}/media`,
          form,
          options.onProgress,
        )) as Item;
      },
      async attachModel(id, model, onProgress, signal) {
        // [PROPOSED] One request on the media route, with the multipart field names
        // the Artiko API uses on `POST /works`: `file` (1K), `model_hd` (2K), `poster`,
        // plus `source_name`, the name of the file the contributor chose, which the
        // media list shows in place of the name of the 1K part.
        // A request given up before it leaves is not sent. Once it is in flight it
        // runs to its end: the caller sends one model at a time and waits for it.
        signal?.throwIfAborted();
        const form = new FormData();
        form.set('file', model.model1k);
        form.set('kind', 'model');
        form.set('model_hd', model.model2k);
        form.set('poster', model.poster);
        form.set('source_name', model.sourceName);
        return (await upload(
          'POST',
          `/api/items/${encodeURIComponent(id)}/media`,
          form,
          onProgress,
        )) as Item;
      },
      async removeMedia(id, mediaId) {
        // [PROPOSED]
        return (await send(
          'DELETE',
          `/api/items/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`,
        )) as Item;
      },
      async setPrimaryMedia(id, mediaId) {
        // [PROPOSED]
        return (await post(
          `/api/items/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}/primary`,
        )) as Item;
      },
      async submit(id) {
        // [PROPOSED]
        return (await post(
          `/api/items/${encodeURIComponent(id)}/submit`,
        )) as Item;
      },
      async withdraw(id) {
        // [PROPOSED]
        return (await post(
          `/api/items/${encodeURIComponent(id)}/withdraw`,
        )) as Item;
      },
      async review(id, input) {
        return (await post(
          `/api/items/${encodeURIComponent(id)}/review`,
          input,
        )) as Item;
      },
      async setPublication(id, status) {
        // [PROPOSED]
        return (await post(`/api/items/${encodeURIComponent(id)}/publication`, {
          status,
        })) as Item;
      },
      async model3d(id) {
        return (await get(
          `/api/items/${encodeURIComponent(id)}/model3d`,
        )) as Model3dDisplay;
      },
      async mint(id, idempotencyKey) {
        return (await post(
          `/api/items/${encodeURIComponent(id)}/mint`,
          {},
          {
            'idempotency-key': idempotencyKey,
          },
        )) as Item['provenance'];
      },
      async provenance(id) {
        return (await get(
          `/api/items/${encodeURIComponent(id)}/provenance`,
        )) as Item['provenance'];
      },
    },

    verification: {
      async start(id) {
        // [PROPOSED]
        return (await post(
          `/api/items/${encodeURIComponent(id)}/verification`,
        )) as Item['verification'];
      },
      async get(id) {
        // [PROPOSED]
        return (await get(
          `/api/items/${encodeURIComponent(id)}/verification`,
        )) as Item['verification'];
      },
    },

    scan: {
      // Every scan route is [PROPOSED].
      async create(input) {
        return (await post('/api/scan-sessions', input)) as ScanSession;
      },
      async get(id) {
        return (await get(
          `/api/scan-sessions/${encodeURIComponent(id)}`,
        )) as ScanSession;
      },
      async getByCode(code) {
        return (await get(
          `/api/scan-sessions/by-code/${encodeURIComponent(code.trim().toUpperCase())}`,
        )) as ScanSession;
      },
      async connect(id, device) {
        return (await post(
          `/api/scan-sessions/${encodeURIComponent(id)}/connect`,
          device,
        )) as ScanSession;
      },
      async setStage(id, stage, progress, error = null) {
        return (await post(
          `/api/scan-sessions/${encodeURIComponent(id)}/stage`,
          {
            stage,
            progress,
            error,
          },
        )) as ScanSession;
      },
      async upload(id, file, onProgress) {
        const form = new FormData();
        form.set('file', file);
        return (await upload(
          'PUT',
          `/api/scan-sessions/${encodeURIComponent(id)}/file`,
          form,
          onProgress,
        )) as ScanSession;
      },
      async attach(id, itemId) {
        return (await post(
          `/api/scan-sessions/${encodeURIComponent(id)}/attach`,
          {
            itemId,
          },
        )) as Item;
      },
    },
  };
}
