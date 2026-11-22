import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, isApiError, resetDemoData } from '..';
import { session } from '../../session/session';
import type { ItemDraftInput } from '../types';

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

/** What the short wizard sends: a title, an art form, no artist, no provenance. */
const SHORT_DRAFT: ItemDraftInput = {
  title: 'Vase',
  author: '',
  medium: 'sculpture',
  details: {},
  rights: {},
};

function scan() {
  return {
    sourceName: 'vase.usdz',
    model1k: new File([new Uint8Array(10)], 'vase-1k.glb'),
    model2k: new File([new Uint8Array(30)], 'vase-2k.glb'),
    poster: new File([new Uint8Array(5)], 'vase-poster.webp'),
  };
}

async function refusal(id: string): Promise<string[]> {
  try {
    await api.items.submit(id);
  } catch (error) {
    if (isApiError(error) && error.code === 'VALIDATION_FAILED') {
      return error.details.map((detail) => detail.field);
    }
    throw error;
  }
  return [];
}

describe('mock api, submit of the short form', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn(CONTRIBUTOR);
    URL.createObjectURL = vi.fn(
      (file: Blob) => `blob:kanto-test/${(file as File).name}`,
    );
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('asks only for a photograph or a 3D model and for the consent', async () => {
    const item = await api.items.create(SHORT_DRAFT);

    expect(await refusal(item.id)).toEqual(['media', 'consent']);
  });

  it('accepts a title, an art form, a ready 3D model and the one consent, and fills the rest', async () => {
    const item = await api.items.create(SHORT_DRAFT);
    await api.items.attachModel(item.id, scan());
    await api.items.update(item.id, {
      rights: { consentShare: true, consentDisplay: true },
    });

    const sent = await api.items.submit(item.id);

    expect(sent.review.state).toBe('pending');
    expect(sent.author).not.toBe('');
    expect(sent.author).toBe(session.getState().account?.displayName);
    expect(sent.rights.relationship).toBe('author');
  });

  it('keeps a relationship and an artist given earlier', async () => {
    const item = await api.items.create({
      ...SHORT_DRAFT,
      author: 'Atelier Rakoto',
      rights: { relationship: 'representative' },
    });
    await api.items.attachModel(item.id, scan());
    await api.items.update(item.id, {
      rights: { consentShare: true, consentDisplay: true },
    });

    const sent = await api.items.submit(item.id);

    expect(sent.author).toBe('Atelier Rakoto');
    expect(sent.rights.relationship).toBe('representative');
  });
});
