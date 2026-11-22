import { getConsoleFunction, setConsoleFunction } from 'three';

/*
 * three.js r183 deprecates THREE.Clock and warns each time one is created.
 * React Three Fiber 9 creates one for every canvas and offers no way to
 * replace it, so the room would log a warning this code cannot act on. That
 * single message is dropped; every other three.js message keeps its normal
 * route to the console. Remove this module once React Three Fiber runs on
 * THREE.Timer.
 */

type Level = 'log' | 'warn' | 'error';
type ThreeConsole = (
  level: Level,
  message: string,
  ...params: unknown[]
) => void;

const CLOCK_DEPRECATION = 'THREE.Clock: This module has been deprecated';

interface StackTrace {
  getError: (message: string) => unknown;
}

/** three.js hands its TSL messages a stack trace and prints it as an error. */
function isStackTrace(value: unknown): value is StackTrace {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isStackTrace' in value &&
    value.isStackTrace === true &&
    'getError' in value &&
    typeof value.getError === 'function'
  );
}

/** Prints a message the way three.js does without a console function. */
function print(level: Level, message: string, ...params: unknown[]): void {
  const [first] = params;
  if (level !== 'log' && isStackTrace(first)) {
    console[level](first.getError(message));
    return;
  }
  console[level](message, ...params);
}

export function isClockDeprecation(level: Level, message: string): boolean {
  return level === 'warn' && message.includes(CLOCK_DEPRECATION);
}

/** Routes three.js messages through `next`, minus the Clock deprecation. */
export function withoutClockDeprecation(next: ThreeConsole): ThreeConsole {
  return (level, message, ...params) => {
    if (!isClockDeprecation(level, message)) {
      next(level, message, ...params);
    }
  };
}

let installed = false;

/** Installs the filter once, in front of a console function set earlier. */
export function quietClockDeprecation(): void {
  if (installed) {
    return;
  }
  installed = true;
  const previous: ThreeConsole | null = getConsoleFunction();
  setConsoleFunction(withoutClockDeprecation(previous ?? print));
}
