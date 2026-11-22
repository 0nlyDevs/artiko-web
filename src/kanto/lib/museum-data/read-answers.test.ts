import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/lib/api';
import { ARTIST_CHIPS, buildMuseumPlan, CONTRACT_CATEGORIES } from './plan';
import type { PlanApi } from './read-answers';
import { readPlanAnswers } from './read-answers';

const TWO: Category[] = [
  { id: 'painting', label: 'Painting' },
  { id: 'dance', label: 'Dance' },
];

function fakeApi(overrides: Partial<PlanApi> = {}): PlanApi {
  return {
    categories: vi.fn(() => Promise.resolve(TWO)),
    firstWork: vi.fn((categoryId: string) =>
      Promise.resolve(categoryId === 'painting' ? [{ id: 'w1' }] : []),
    ),
    artists: vi.fn(() =>
      Promise.resolve([
        { id: 'a1', display_name: 'Hei', bio: '', region: 'Analamanga' },
      ]),
    ),
    ...overrides,
  };
}

/** Rejects when the signal aborts, as fetch does. */
function untilAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const fail = (): void => {
      reject(new Error('aborted'));
    };
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener('abort', fail, { once: true });
  });
}

describe('readPlanAnswers', () => {
  it('reads the categories and the artists, then one probe per category', async () => {
    const api = fakeApi();
    const signal = new AbortController().signal;

    const answers = await readPlanAnswers(api, signal);

    expect(api.categories).toHaveBeenCalledTimes(1);
    expect(api.artists).toHaveBeenCalledWith(ARTIST_CHIPS, signal);
    expect(api.firstWork).toHaveBeenCalledTimes(2);
    expect(api.firstWork).toHaveBeenCalledWith('painting', signal);
    expect(api.firstWork).toHaveBeenCalledWith('dance', signal);
    expect(buildMuseumPlan(answers)).toEqual({
      rooms: [
        { id: 'painting', label: 'Painting', state: 'open' },
        { id: 'dance', label: 'Dance', state: 'empty' },
      ],
      artists: [{ id: 'a1', name: 'Hei', region: 'Analamanga' }],
      complete: true,
    });
  });

  it('turns a probe that fails into an unknown room, without losing the others', async () => {
    const api = fakeApi({
      firstWork: (categoryId) =>
        categoryId === 'dance'
          ? Promise.reject(new Error('500'))
          : Promise.resolve([{ id: 'w1' }]),
    });

    const plan = buildMuseumPlan(
      await readPlanAnswers(api, new AbortController().signal),
    );

    expect(plan.rooms.map((room) => room.state)).toEqual(['open', 'unknown']);
    expect(plan.artists).toHaveLength(1);
    expect(plan.complete).toBe(false);
  });

  it('probes the art forms of the contract when the categories cannot be read', async () => {
    const firstWork = vi.fn((categoryId: string) =>
      Promise.resolve(categoryId === 'crafts' ? [{ id: 'w1' }] : []),
    );
    const api = fakeApi({
      categories: () => Promise.reject(new Error('500')),
      firstWork,
    });

    const plan = buildMuseumPlan(
      await readPlanAnswers(api, new AbortController().signal),
    );

    expect(firstWork).toHaveBeenCalledTimes(CONTRACT_CATEGORIES.length);
    expect(plan.rooms).toHaveLength(8);
    expect(plan.rooms.find((room) => room.id === 'crafts')?.state).toBe('open');
    expect(plan.rooms.find((room) => room.id === 'dance')?.state).toBe('empty');
    expect(plan.complete).toBe(false);
  });

  it('resolves with the fallback plan when the API does not answer before the time limit', async () => {
    const api: PlanApi = {
      categories: untilAborted,
      firstWork: (_categoryId, signal) => untilAborted(signal),
      artists: (_limit, signal) => untilAborted(signal),
    };
    const limit = new AbortController();

    const pending = readPlanAnswers(api, limit.signal);
    limit.abort();
    const plan = buildMuseumPlan(await pending);

    expect(plan.rooms).toHaveLength(8);
    expect(plan.rooms.every((room) => room.state === 'unknown')).toBe(true);
    expect(plan.artists).toEqual([]);
    expect(plan.complete).toBe(false);
  });

  it('stops waiting at the time limit even when a call ignores the signal', async () => {
    const never = (): Promise<never> => new Promise(() => undefined);
    const firstWork = vi.fn(never);
    const api: PlanApi = { categories: never, firstWork, artists: never };
    const limit = new AbortController();

    const pending = readPlanAnswers(api, limit.signal);
    limit.abort();
    const plan = buildMuseumPlan(await pending);

    expect(plan.rooms.every((room) => room.state === 'unknown')).toBe(true);
    expect(plan.complete).toBe(false);
    // Past the limit no probe is sent at all.
    expect(firstWork).not.toHaveBeenCalled();
  });

  it('never rejects, even when every call throws at once', async () => {
    const boom = (): Promise<never> => Promise.reject(new Error('unreachable'));
    const api: PlanApi = { categories: boom, firstWork: boom, artists: boom };

    await expect(
      readPlanAnswers(api, new AbortController().signal),
    ).resolves.toMatchObject({
      categories: { ok: false },
      artists: { ok: false },
    });
  });
});
