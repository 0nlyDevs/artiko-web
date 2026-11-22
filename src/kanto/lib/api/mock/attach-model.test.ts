import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetDemoData } from '..';
import { createGatewayClient } from '../gateway/gateway-client';
import { session } from '../../session/session';
import type { ItemDraftInput, PreparedModel } from '../types';

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

const DRAFT: ItemDraftInput = {
  title: 'Vase',
  author: '',
  medium: 'sculpture',
  details: {},
  rights: {},
};

/** Three files named after the scan, as the import pipeline names them. */
function preparedModel(sourceName: string): PreparedModel {
  const base = sourceName.replace(/\.[^.]*$/, '');
  return {
    sourceName,
    model1k: new File([new Uint8Array(10)], `${base}-1k.glb`),
    model2k: new File([new Uint8Array(30)], `${base}-2k.glb`),
    poster: new File([new Uint8Array(5)], `${base}-poster.webp`),
  };
}

function modelRows(media: readonly { kind: string; name: string }[]): string[] {
  return media
    .filter((candidate) => candidate.kind === 'model')
    .map((candidate) => candidate.name);
}

describe('mock api, attachModel', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn(CONTRIBUTOR);
    // jsdom has no object URLs. Each one names its file, so a test tells
    // which file went into which variant.
    URL.createObjectURL = vi.fn(
      (file: Blob) => `blob:kanto-test/${(file as File).name}`,
    );
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('puts the 1K file, the 2K file and the poster of a prepared scan in their own variant', async () => {
    const item = await api.items.create(DRAFT);
    const progress: number[] = [];

    const updated = await api.items.attachModel(
      item.id,
      preparedModel('vase.usdz'),
      ({ loaded, total }) => progress.push(loaded / total),
    );

    expect(updated.model3d).toEqual({
      contentId: item.id,
      status: 'ready',
      variants: {
        glb1k: 'blob:kanto-test/vase-1k.glb',
        glb2k: 'blob:kanto-test/vase-2k.glb',
        poster: 'blob:kanto-test/vase-poster.webp',
      },
    });
    expect(
      updated.media.filter((media) => media.kind === 'model'),
    ).toMatchObject([
      {
        name: 'vase.usdz',
        url: 'blob:kanto-test/vase-1k.glb',
        bytes: 10,
        status: 'ready',
      },
    ]);
    expect(progress.at(-1)).toBe(1);
    expect((await api.items.model3d(item.id)).status).toBe('ready');
  });

  it('keeps one model per item: a new scan replaces the row and the three variants of the previous one', async () => {
    const item = await api.items.create(DRAFT);

    await api.items.attachModel(item.id, preparedModel('premier.usdz'));
    const updated = await api.items.attachModel(
      item.id,
      preparedModel('second.glb'),
    );

    expect(modelRows(updated.media)).toEqual(['second.glb']);
    expect(updated.model3d.variants).toEqual({
      glb1k: 'blob:kanto-test/second-1k.glb',
      glb2k: 'blob:kanto-test/second-2k.glb',
      poster: 'blob:kanto-test/second-poster.webp',
    });
  });

  it('keeps the previous model listed and shown until the new one is received', async () => {
    const item = await api.items.create(DRAFT);
    await api.items.attachModel(item.id, preparedModel('premier.usdz'));

    const replacement = api.items.attachModel(
      item.id,
      preparedModel('second.glb'),
    );
    const meanwhile = await api.items.get(item.id);

    expect(modelRows(meanwhile.media)).toEqual(['premier.usdz']);
    expect(meanwhile.model3d.variants?.glb1k).toBe(
      'blob:kanto-test/premier-1k.glb',
    );
    expect(modelRows((await replacement).media)).toEqual(['second.glb']);
  });

  it('attaches nothing when the request is given up while the files are sent', async () => {
    const item = await api.items.create(DRAFT);
    await api.items.attachModel(item.id, preparedModel('premier.usdz'));
    const controller = new AbortController();
    const progress: number[] = [];

    const abandoned = api.items.attachModel(
      item.id,
      preparedModel('second.glb'),
      ({ loaded, total }) => {
        progress.push(loaded / total);
        controller.abort();
      },
      controller.signal,
    );

    await expect(abandoned).rejects.toMatchObject({ name: 'AbortError' });
    // The upload stopped at its first report.
    expect(progress).toHaveLength(1);
    const stored = await api.items.get(item.id);
    expect(modelRows(stored.media)).toEqual(['premier.usdz']);
    expect(stored.model3d.variants?.glb1k).toBe(
      'blob:kanto-test/premier-1k.glb',
    );
  });

  it('attaches nothing when the request was given up before it started', async () => {
    const item = await api.items.create(DRAFT);
    const controller = new AbortController();
    controller.abort();

    await expect(
      api.items.attachModel(
        item.id,
        preparedModel('vase.usdz'),
        undefined,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect((await api.items.get(item.id)).model3d.status).toBe('missing');
  });
});

/** Stands for the browser request of the gateway upload and keeps what was sent. */
class RecordedRequest {
  static sent: { method: string; url: string; form: FormData }[] = [];
  readonly upload = { addEventListener: (): void => undefined };
  readonly status = 200;
  readonly responseText = '{}';
  withCredentials = false;
  private method = '';
  private url = '';
  private readonly listeners = new Map<string, () => void>();

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  send(form: FormData): void {
    RecordedRequest.sent.push({ method: this.method, url: this.url, form });
    queueMicrotask(() => {
      this.listeners.get('load')?.();
    });
  }
}

describe('gateway api, attachModel', () => {
  beforeEach(() => {
    RecordedRequest.sent = [];
    vi.stubGlobal('XMLHttpRequest', RecordedRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the three files and the name of the chosen file in one request on the media route', async () => {
    const gateway = createGatewayClient();

    await gateway.items.attachModel('item-1', preparedModel('vase.usdz'));

    expect(RecordedRequest.sent).toHaveLength(1);
    const request = RecordedRequest.sent[0];
    expect(request?.method).toBe('POST');
    expect(request?.url).toBe('/api/items/item-1/media');
    const form = request?.form;
    expect(form?.get('kind')).toBe('model');
    expect(form?.get('source_name')).toBe('vase.usdz');
    expect((form?.get('file') as File).name).toBe('vase-1k.glb');
    expect((form?.get('model_hd') as File).name).toBe('vase-2k.glb');
    expect((form?.get('poster') as File).name).toBe('vase-poster.webp');
  });

  it('does not send a request given up before it leaves', async () => {
    const gateway = createGatewayClient();
    const controller = new AbortController();
    controller.abort();

    await expect(
      gateway.items.attachModel(
        'item-1',
        preparedModel('vase.usdz'),
        undefined,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(RecordedRequest.sent).toHaveLength(0);
  });
});
