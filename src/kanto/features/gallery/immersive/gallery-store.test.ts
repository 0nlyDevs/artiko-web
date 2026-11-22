import { beforeEach, describe, expect, it } from 'vitest';
import { dollyRange } from './gallery-layout';
import {
  PITCH_MAX,
  PITCH_MIN,
  SPIN_MAX_VELOCITY,
  TURN_STEP,
  advanceSpin,
  dollyBy,
  dollyTo,
  galleryStore,
  input,
  lens,
  moveRail,
  rail,
  railTo,
  resetView,
  setRailBounds,
  setSpinVelocity,
  spin,
  subjectIndex,
  turnBy,
  turnStep,
} from './gallery-store';

describe('galleryStore', () => {
  beforeEach(() => {
    galleryStore.reset();
  });

  it('enters the room, then visits once the travelling is done', () => {
    galleryStore.start(1000);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'entering',
      introStartedAt: 1000,
    });
    galleryStore.introDone();
    expect(galleryStore.getState().phase).toBe('visiting');
  });

  it('lands directly on the rail when the intro is skipped', () => {
    galleryStore.start(0, true);
    expect(galleryStore.getState().phase).toBe('visiting');
  });

  it('focuses a work only after the entrance, and unfocuses back to the visit', () => {
    galleryStore.focus(1);
    expect(galleryStore.getState().phase).toBe('entering');

    galleryStore.start(0, true);
    galleryStore.focus(2);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 2,
      activeIndex: 2,
      noticeOpen: false,
    });
    galleryStore.unfocus();
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      focusedIndex: null,
      activeIndex: 2,
    });
  });

  it('focuses without opening the notice, and forgets the hover', () => {
    galleryStore.start(0, true);
    galleryStore.setHovered(1);
    galleryStore.focus(1);
    expect(galleryStore.getState()).toMatchObject({
      noticeOpen: false,
      hoveredIndex: null,
    });
  });

  it('moves the focus from one work to the next without leaving it', () => {
    galleryStore.start(0, true);
    galleryStore.focus(0);
    galleryStore.focus(1);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 1,
      activeIndex: 1,
    });
  });

  it('notifies once per transition, and not for a focus already held', () => {
    galleryStore.start(0, true);
    let notified = 0;
    const unsubscribe = galleryStore.subscribe(() => {
      notified += 1;
    });
    galleryStore.focus(3);
    galleryStore.focus(3);
    galleryStore.unfocus();
    galleryStore.unfocus();
    expect(notified).toBe(2);
    unsubscribe();
  });

  it('opens the notice from the visit and returns to the visit', () => {
    galleryStore.start(0, true);
    galleryStore.openNotice();
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      noticeOpen: true,
    });
    galleryStore.closeNotice();
    expect(galleryStore.getState()).toMatchObject({
      phase: 'visiting',
      noticeOpen: false,
    });
  });

  it('opens the notice from the focus and returns to the focus', () => {
    galleryStore.start(0, true);
    galleryStore.focus(2);
    galleryStore.openNotice();
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 2,
      noticeOpen: true,
    });
    galleryStore.closeNotice();
    expect(galleryStore.getState()).toMatchObject({
      phase: 'focus',
      focusedIndex: 2,
      noticeOpen: false,
    });
  });

  it('keeps the notice closed during the entrance', () => {
    galleryStore.start(0);
    galleryStore.openNotice();
    expect(galleryStore.getState().noticeOpen).toBe(false);
  });

  it('frames the focused work, or the one in front of the visitor', () => {
    galleryStore.start(0, true);
    galleryStore.setActive(3);
    expect(subjectIndex(galleryStore.getState())).toBe(3);
    galleryStore.focus(1);
    expect(subjectIndex(galleryStore.getState())).toBe(1);
  });

  it('keeps the rail within its bounds', () => {
    setRailBounds(1, 5);
    moveRail(10);
    expect(rail.target).toBe(5);
    railTo(-3);
    expect(rail.target).toBe(1);
    setRailBounds(2, 3);
    expect(rail.target).toBe(2);
  });

  it('records media status and notifies subscribers once per change', () => {
    let notified = 0;
    const unsubscribe = galleryStore.subscribe(() => {
      notified += 1;
    });
    galleryStore.setMediaStatus('peinture/01', 'ready');
    galleryStore.setMediaStatus('peinture/01', 'ready');
    expect(galleryStore.getState().media['peinture/01']).toBe('ready');
    expect(notified).toBe(1);
    unsubscribe();
  });

  it('forgets the visit on reset, including the input lock and the notice', () => {
    galleryStore.start(0, true);
    galleryStore.focus(1);
    galleryStore.openNotice();
    turnBy(1, 0.2);
    dollyTo(0.9, dollyRange('painting'));
    input.locked = true;
    railTo(4);
    galleryStore.reset();
    expect(input.locked).toBe(false);
    expect(rail.target).toBe(0);
    expect(spin).toMatchObject({ yaw: 0, pitch: 0, velocity: 0 });
    expect(lens.dolly).toBe(1);
    expect(galleryStore.getState()).toMatchObject({
      phase: 'entering',
      focusedIndex: null,
      noticeOpen: false,
    });
  });
});

describe('turn of a focused object', () => {
  beforeEach(() => {
    galleryStore.reset();
    galleryStore.start(0, true);
    galleryStore.focus(0);
  });

  it('turns freely around the vertical axis', () => {
    turnBy(4, 0);
    turnBy(4, 0);
    expect(spin.yaw).toBe(8);
    turnBy(-20, 0);
    expect(spin.yaw).toBe(-12);
  });

  it('clamps the pitch to a small range, so the underside never shows', () => {
    turnBy(0, 10);
    expect(spin.pitch).toBe(PITCH_MAX);
    turnBy(0, -10);
    expect(spin.pitch).toBe(PITCH_MIN);
    // Leaning the object back is the tight side of the range.
    expect(Math.abs(PITCH_MIN)).toBeLessThan(0.2);
    expect(PITCH_MAX).toBeLessThan(0.6);
    turnBy(0, 0.05);
    expect(spin.pitch).toBeCloseTo(PITCH_MIN + 0.05);
  });

  it('turns by 30 degrees per press of a button', () => {
    expect(TURN_STEP).toBeCloseTo((30 * Math.PI) / 180);
    turnStep(1);
    turnStep(1);
    expect(spin.yaw).toBeCloseTo(2 * TURN_STEP);
    turnStep(-1);
    expect(spin.yaw).toBeCloseTo(TURN_STEP);
  });

  it('stops the inertia of a drag when a button is pressed', () => {
    setSpinVelocity(3);
    turnStep(1);
    expect(spin.velocity).toBe(0);
  });

  it('resets to the resting orientation by the shortest way', () => {
    turnBy(Math.PI * 2 + 0.7, 0.3);
    setSpinVelocity(2);
    dollyTo(0.8, dollyRange('sculpture'));
    resetView();
    // One whole turn is the same orientation as none: no unwinding.
    expect(spin.yaw).toBeCloseTo(Math.PI * 2);
    expect(spin.pitch).toBe(0);
    expect(spin.velocity).toBe(0);
    expect(lens.dolly).toBe(1);
  });

  it('keeps turning for a moment after a flick, then stops', () => {
    setSpinVelocity(2);
    advanceSpin(0.1, false);
    expect(spin.yaw).toBeCloseTo(0.2);
    expect(spin.velocity).toBeGreaterThan(0);
    expect(spin.velocity).toBeLessThan(2);
    for (let frame = 0; frame < 240; frame += 1) {
      advanceSpin(1 / 60, false);
    }
    expect(spin.velocity).toBe(0);
    // A little inertia: well under a quarter turn for an ordinary flick.
    expect(spin.yaw).toBeLessThan(Math.PI / 2);
  });

  it('caps the speed a flick can leave', () => {
    setSpinVelocity(400);
    expect(spin.velocity).toBe(SPIN_MAX_VELOCITY);
    setSpinVelocity(-400);
    expect(spin.velocity).toBe(-SPIN_MAX_VELOCITY);
  });

  it('does not drift while the visitor holds the object', () => {
    setSpinVelocity(2);
    spin.dragging = true;
    advanceSpin(0.1, false);
    expect(spin.yaw).toBe(0);
  });

  it('has no inertia under reduced motion', () => {
    setSpinVelocity(2);
    advanceSpin(0.1, true);
    expect(spin.yaw).toBe(0);
    expect(spin.velocity).toBe(0);
  });

  it('rests the turn and the dolly when the focus moves or ends', () => {
    turnBy(2, 0.3);
    setSpinVelocity(3);
    dollyTo(0.8, dollyRange('sculpture'));
    galleryStore.focus(1);
    expect(spin).toMatchObject({ yaw: 0, pitch: 0, velocity: 0 });
    expect(lens.dolly).toBe(1);

    turnBy(1, 0.1);
    dollyTo(0.9, dollyRange('sculpture'));
    galleryStore.unfocus();
    expect(spin).toMatchObject({ yaw: 0, pitch: 0, velocity: 0 });
    expect(lens.dolly).toBe(1);
  });

  it('keeps the turn when the same work is focused again', () => {
    turnBy(2, 0.3);
    galleryStore.focus(0);
    expect(spin.yaw).toBe(2);
    expect(spin.pitch).toBeCloseTo(0.3);
  });
});

describe('dolly of the focus', () => {
  beforeEach(() => {
    galleryStore.reset();
  });

  it('comes closer and steps back within the range of the work', () => {
    const [closest, furthest] = dollyRange('sculpture');
    dollyBy(0.9, dollyRange('sculpture'));
    expect(lens.dolly).toBeCloseTo(0.9);
    dollyBy(0.01, dollyRange('sculpture'));
    expect(lens.dolly).toBe(closest);
    dollyBy(100, dollyRange('sculpture'));
    expect(lens.dolly).toBe(furthest);
    expect(closest).toBeGreaterThan(0.5);
    expect(furthest).toBeLessThan(1.3);
  });

  it('lets a painting lean in less than an object', () => {
    expect(dollyRange('painting')[0]).toBeGreaterThan(
      dollyRange('sculpture')[0],
    );
    dollyTo(0.1, dollyRange('painting'));
    expect(lens.dolly).toBe(dollyRange('painting')[0]);
  });
});
