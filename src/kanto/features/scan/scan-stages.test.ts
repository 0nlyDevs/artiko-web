import { describe, expect, it } from 'vitest';
import type { ScanSession } from '../../lib/api/types';
import { deviceFromUserAgent, formatBytes, trackerSteps } from './scan-stages';

function sessionAt(stage: ScanSession['stage']): ScanSession {
  return {
    id: 's1',
    code: 'ABCDEF',
    itemId: null,
    ownerId: null,
    stage,
    progress: 0.5,
    device:
      stage === 'created'
        ? null
        : {
            name: 'iPhone',
            platform: 'iOS',
            connectedAt: '2026-11-22T10:00:00.000Z',
          },
    file:
      stage === 'ready'
        ? { name: 'vase.glb', bytes: 1_500_000, kind: 'glb' }
        : null,
    model3d: null,
    pairingPath: '/numerisation/s1/telephone',
    createdAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-22T10:00:00.000Z',
    expiresAt: '2026-11-22T10:30:00.000Z',
    error: stage === 'failed' ? 'Format non reconnu.' : null,
  };
}

describe('trackerSteps', () => {
  it('marks the created session as waiting for the phone', () => {
    const steps = trackerSteps(sessionAt('created'));
    expect(steps.map((step) => step.state)).toEqual([
      'done',
      'active',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('shows the upload progress on the transfer step', () => {
    const steps = trackerSteps(sessionAt('uploading'));
    expect(steps[3]?.state).toBe('done');
    expect(steps[4]?.state).toBe('active');
  });

  it('marks everything done once the model is ready', () => {
    const steps = trackerSteps(sessionAt('ready'));
    expect(steps.every((step) => step.state === 'done')).toBe(true);
    expect(steps[4]?.detail).toBe('vase.glb');
  });

  it('fails the transfer step with the session error', () => {
    const steps = trackerSteps(sessionAt('failed'));
    expect(steps[3]).toEqual({
      title: 'Transfert du fichier',
      state: 'failed',
      detail: 'Format non reconnu.',
    });
  });
});

describe('helpers', () => {
  it('formats sizes in French units', () => {
    expect(formatBytes(1_500_000)).toBe('1,5 Mo');
    expect(formatBytes(42_000)).toBe('42 ko');
  });

  it('reduces the user agent to a device name', () => {
    expect(
      deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'),
    ).toEqual({
      name: 'iPhone',
      platform: 'iOS',
    });
    expect(deviceFromUserAgent('Mozilla/5.0 (Macintosh)')).toEqual({
      name: 'Ordinateur',
      platform: 'web',
    });
  });
});
