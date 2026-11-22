import { describe, expect, it, vi } from 'vitest';
import { Clock, getConsoleFunction, warn } from 'three';
import {
  isClockDeprecation,
  quietClockDeprecation,
  withoutClockDeprecation,
} from './three-console';

const CLOCK_MESSAGE =
  'THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

describe('withoutClockDeprecation', () => {
  it('drops the Clock deprecation warning', () => {
    const next = vi.fn();
    withoutClockDeprecation(next)('warn', CLOCK_MESSAGE);

    expect(next).not.toHaveBeenCalled();
  });

  it('keeps every other three.js message', () => {
    const next = vi.fn();
    const route = withoutClockDeprecation(next);
    route('warn', 'THREE.WebGLRenderer: Context Lost.');
    route('error', 'THREE.WebGLProgram: Shader Error', 1281);
    route('log', CLOCK_MESSAGE);

    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenCalledWith(
      'error',
      'THREE.WebGLProgram: Shader Error',
      1281,
    );
  });

  it('recognises the warning by level and text', () => {
    expect(isClockDeprecation('warn', CLOCK_MESSAGE)).toBe(true);
    expect(isClockDeprecation('error', CLOCK_MESSAGE)).toBe(false);
    expect(isClockDeprecation('warn', 'THREE.Clock: something else')).toBe(
      false,
    );
  });
});

describe('quietClockDeprecation', () => {
  it('silences a new Clock and still prints other warnings', () => {
    const consoleWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    quietClockDeprecation();
    quietClockDeprecation();

    expect(getConsoleFunction()).toBeTypeOf('function');
    expect(new Clock()).toBeInstanceOf(Clock);
    expect(consoleWarn).not.toHaveBeenCalled();

    warn('WebGLRenderer: Context Lost.');
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      'THREE.WebGLRenderer: Context Lost.',
    );
  });
});
