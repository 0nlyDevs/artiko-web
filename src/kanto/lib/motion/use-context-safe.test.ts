import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { gsap } from './gsap';
import { useContextSafe } from './use-context-safe';

describe('useContextSafe', () => {
  it('runs the handler of the last render with its arguments', () => {
    const scope = { current: document.body };
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ handler }: { handler: (direction: number) => void }) =>
        useContextSafe(scope, handler),
      { initialProps: { handler: first } },
    );

    result.current(1);
    rerender({ handler: second });
    result.current(-1);

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(-1);
  });

  it('reverts the animations of the handler when the component unmounts', () => {
    const scope = { current: document.body };
    const target = document.createElement('div');
    document.body.append(target);
    const { result, unmount } = renderHook(() =>
      useContextSafe(scope, () => {
        gsap.to(target, { x: 100, duration: 1 });
      }),
    );

    result.current();
    expect(gsap.getTweensOf(target)).toHaveLength(1);

    unmount();
    expect(gsap.getTweensOf(target)).toHaveLength(0);
    target.remove();
  });
});
