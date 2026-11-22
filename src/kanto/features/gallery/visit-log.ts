/*
 * A small log of the visit, kept in sessionStorage, so the end-of-visit page
 * (Figma A6) can say how many rooms and works were seen and for how long.
 */

export interface VisitLog {
  startedAt: number;
  roomsVisited: string[];
  worksSeen: string[];
  /** Milliseconds between the first and the last recorded room. */
  durationMs: number;
}

const KEY = 'kanto.visit';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function empty(): VisitLog {
  return {
    startedAt: Date.now(),
    roomsVisited: [],
    worksSeen: [],
    durationMs: 0,
  };
}

export function readVisit(): VisitLog {
  const raw = storage()?.getItem(KEY) ?? null;
  if (raw === null) {
    return empty();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'roomsVisited' in parsed &&
      Array.isArray(parsed.roomsVisited) &&
      'worksSeen' in parsed &&
      Array.isArray(parsed.worksSeen) &&
      'startedAt' in parsed &&
      typeof parsed.startedAt === 'number'
    ) {
      const rooms = parsed.roomsVisited.filter(
        (value): value is string => typeof value === 'string',
      );
      const works = parsed.worksSeen.filter(
        (value): value is string => typeof value === 'string',
      );
      return {
        startedAt: parsed.startedAt,
        roomsVisited: rooms,
        worksSeen: works,
        durationMs: Math.max(0, Date.now() - parsed.startedAt),
      };
    }
  } catch {
    // fall through
  }
  return empty();
}

/** Records that the visitor stands in a room, in front of a work. */
export function recordVisit(roomSlug: string, workId: string | null): void {
  const current = readVisit();
  const roomsVisited = current.roomsVisited.includes(roomSlug)
    ? current.roomsVisited
    : [...current.roomsVisited, roomSlug];
  const worksSeen =
    workId === null || current.worksSeen.includes(workId)
      ? current.worksSeen
      : [...current.worksSeen, workId];
  try {
    storage()?.setItem(
      KEY,
      JSON.stringify({
        startedAt: current.startedAt,
        roomsVisited,
        worksSeen,
      }),
    );
  } catch {
    // sessionStorage unavailable: the end page shows its defaults.
  }
}

export function resetVisit(): void {
  storage()?.removeItem(KEY);
}
