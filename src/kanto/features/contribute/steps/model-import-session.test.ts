import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisposableModelImport } from '@/features/model-import/create-model-import';
import { api, resetDemoData } from '../../../lib/api';
import type { Item } from '../../../lib/api/types';
import { session } from '../../../lib/session/session';
import {
  isModelImportBusy,
  modelImportSession,
  resetModelImportSessions,
} from './model-import-session';

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

/** A pipeline that answers at once, in place of the web worker. */
function fakeImport(): DisposableModelImport {
  return {
    converter: { convertUsdz: () => Promise.resolve(new ArrayBuffer(8)) },
    optimizer: {
      optimize: (_glb, textureSize) =>
        Promise.resolve(new ArrayBuffer(textureSize === 2048 ? 32 : 16)),
    },
    posterRenderer: {
      render: () => Promise.resolve(new Blob(['poster'], { type: 'image/webp' })),
    },
    dispose: () => undefined,
  };
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('model import session', () => {
  let item: Item;

  beforeEach(async () => {
    resetModelImportSessions();
    resetDemoData();
    session.reset();
    await session.signIn(CONTRIBUTOR);
    item = await api.items.create({
      title: 'Vase',
      author: '',
      medium: 'sculpture',
      details: {},
      rights: {},
    });
    // jsdom has no object URLs.
    URL.createObjectURL = vi.fn(
      (file: Blob) => `blob:kanto-test/${(file as File).name}`,
    );
  });

  afterEach(() => {
    resetModelImportSessions();
    session.reset();
    resetDemoData();
  });

  it('is one session per item, kept from one step of the wizard to the next', () => {
    expect(modelImportSession(item.id)).toBe(modelImportSession(item.id));
    expect(modelImportSession(item.id)).not.toBe(modelImportSession('other'));
    expect(modelImportSession(item.id).getState()).toEqual({ phase: 'idle' });
  });

  it('goes from preparing to sending to attached, and reports the weights of the three files', async () => {
    const importSession = modelImportSession(item.id);
    const phases: string[] = [];
    importSession.subscribe(() => {
      const { phase } = importSession.getState();
      if (phases.at(-1) !== phase) {
        phases.push(phase);
      }
    });

    importSession.start(new File(['scan'], 'vase.usdz'), fakeImport);
    expect(isModelImportBusy(importSession.getState())).toBe(true);

    await vi.waitFor(
      () => {
        expect(importSession.getState().phase).toBe('attached');
      },
      { timeout: 4000 },
    );
    expect(phases).toEqual(['preparing', 'sending', 'attached']);
    expect(importSession.getState()).toEqual({
      phase: 'attached',
      fileName: 'vase.usdz',
      modelUrl: 'blob:kanto-test/vase-1k.glb',
      sizes: { model1k: 16, model2k: 32, poster: 6 },
    });
    expect(isModelImportBusy(importSession.getState())).toBe(false);
  });

  it('hands the stored item to a wizard opened again after the model was attached, once', async () => {
    const importSession = modelImportSession(item.id);
    const firstWizard = vi.fn<(updated: Item) => void>();
    importSession.connect(firstWizard);
    importSession.start(new File(['scan'], 'vase.usdz'), fakeImport);
    await vi.waitFor(
      () => {
        expect(firstWizard).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 },
    );

    // The same wizard connecting again (another visit of its media step) is not served twice.
    importSession.connect(firstWizard);
    const secondWizard = vi.fn<(updated: Item) => void>();
    importSession.connect(secondWizard);

    await vi.waitFor(() => {
      expect(secondWizard).toHaveBeenCalledTimes(1);
    });
    expect(secondWizard.mock.calls[0]?.[0].model3d.status).toBe('ready');
    importSession.connect(secondWizard);
    await pause(600);
    expect(firstWizard).toHaveBeenCalledTimes(1);
    expect(secondWizard).toHaveBeenCalledTimes(1);
  });

  it('forgets everything on reset, and a late answer of the pipeline changes nothing', async () => {
    const attach = vi.spyOn(api.items, 'attachModel');
    let finish: (glb: ArrayBuffer) => void = () => undefined;
    const conversion = new Promise<ArrayBuffer>((resolve) => {
      finish = resolve;
    });
    const dispose = vi.fn();
    const importSession = modelImportSession(item.id);

    importSession.start(new File(['scan'], 'vase.usdz'), () => ({
      ...fakeImport(),
      converter: { convertUsdz: () => conversion },
      dispose,
    }));
    await vi.waitFor(() => {
      expect(importSession.getState()).toMatchObject({
        phase: 'preparing',
        current: 'conversion',
      });
    });

    importSession.reset();

    expect(importSession.getState()).toEqual({ phase: 'idle' });
    expect(dispose).toHaveBeenCalled();
    finish(new ArrayBuffer(8));
    await pause(300);
    expect(importSession.getState()).toEqual({ phase: 'idle' });
    expect(attach).not.toHaveBeenCalled();
  });
});
