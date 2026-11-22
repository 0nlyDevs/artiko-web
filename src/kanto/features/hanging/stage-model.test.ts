import { describe, expect, it } from 'vitest';
import { isStageViewer, stageFrame } from './stage-model';

const viewport = { width: 340, height: 620 };

/** Pixels that one metre covers at the target, for a camera at `radius`. */
function pixelsPerMetre(radius: number, fieldOfViewDeg: number): number {
  return viewport.height / 2 / (radius * Math.tan((fieldOfViewDeg * Math.PI) / 360));
}

describe('stageFrame', () => {
  it('looks at the centre of the base, so the object stands on the plinth', () => {
    const frame = stageFrame(
      { x: 0.26, y: 0.44, z: 0.26 },
      { x: 0.1, y: 0.22, z: -0.05 },
      30,
      viewport,
    );
    expect(frame.target[0]).toBeCloseTo(0.1);
    expect(frame.target[1]).toBeCloseTo(0);
    expect(frame.target[2]).toBeCloseTo(-0.05);
  });

  it('shows a tall object as high as the zone above the plinth allows', () => {
    const size = { x: 0.26, y: 0.44, z: 0.26 };
    const frame = stageFrame(size, { x: 0, y: 0.22, z: 0 }, 30, viewport);
    const scale = pixelsPerMetre(frame.radius, 30);
    expect(size.y * scale).toBeCloseTo((viewport.height / 2) * 0.93, 3);
    expect(size.x * scale).toBeLessThan(viewport.width * 0.72);
    expect(frame.span).toBeCloseTo((size.x * scale) / viewport.width, 5);
  });

  it('shows a wide object no wider than the plinth can carry', () => {
    const size = { x: 0.5, y: 0.15, z: 0.4 };
    const frame = stageFrame(size, { x: 0, y: 0.075, z: 0 }, 30, viewport);
    const scale = pixelsPerMetre(frame.radius, 30);
    expect(size.x * scale).toBeCloseTo(viewport.width * 0.72, 3);
    expect(frame.span).toBeCloseTo(0.72, 5);
  });

  it('keeps the size on screen when model-viewer widens the field of view', () => {
    const size = { x: 0.5, y: 0.15, z: 0.5 };
    const center = { x: 0, y: 0.075, z: 0 };
    const narrow = stageFrame(size, center, 30, viewport);
    const wide = stageFrame(size, center, 50, viewport);
    expect(wide.radius).toBeLessThan(narrow.radius);
    expect(pixelsPerMetre(wide.radius, 50)).toBeCloseTo(
      pixelsPerMetre(narrow.radius, 30),
      5,
    );
  });

  it('survives a model without any size', () => {
    const frame = stageFrame({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 30, viewport);
    expect(Number.isFinite(frame.radius)).toBe(true);
    expect(frame.radius).toBeGreaterThan(0);
  });
});

describe('isStageViewer', () => {
  it('is false for an element that model-viewer has not upgraded', () => {
    const element = document.createElement('model-viewer');
    expect(isStageViewer(Object.assign(element, { cameraOrbit: '' }))).toBe(false);
  });

  it('is true once the calls of the plinth exist', () => {
    const element = Object.assign(document.createElement('model-viewer'), {
      cameraOrbit: '',
      getDimensions: () => ({ x: 1, y: 1, z: 1 }),
      getBoundingBoxCenter: () => ({ x: 0, y: 0, z: 0 }),
      getFieldOfView: () => 30,
      updateFraming: () => Promise.resolve(),
      jumpCameraToGoal: () => undefined,
    });
    expect(isStageViewer(element)).toBe(true);
  });
});
