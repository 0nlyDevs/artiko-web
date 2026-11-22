import { ApiError, getMe, getWork, listMyVotes, unwrap } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import type { Voter } from "./disabled-reason";

/**
 * What the browser knows of the person who may vote. It is read once per signed-in person
 * (`GET /me` for their artist profile, `GET /votes/mine` for their votes of the month) and shared by
 * every vote block on screen, so walking from work to work asks the API nothing more.
 *
 * - `pending`: the session or these two reads have not answered yet;
 * - `anonymous`: nobody is signed in;
 * - `ready`: the votes and the profile are known, the reasons can be computed before a click;
 * - `unknown`: signed in, but the reads failed: the vote stays open and the API remains the judge.
 */
export type VoterState =
  | { status: "pending" }
  | { status: "anonymous" }
  | ({ status: "ready" } & Voter)
  | { status: "unknown"; error: ApiError | null };

export interface VoterSnapshot {
  /** `undefined` until the session is known, then the signed-in person's id or null. */
  userId: string | null | undefined;
  voter: VoterState;
  /** Vote counts re-read after a vote, by work id. */
  counts: Readonly<Record<string, number>>;
}

const INITIAL: VoterSnapshot = { userId: undefined, voter: { status: "pending" }, counts: {} };

let snapshot: VoterSnapshot = INITIAL;
const listeners = new Set<() => void>();

function set(next: Partial<VoterSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeVoter(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const voterSnapshot = () => snapshot;
/** The server and the first paint in the browser know nobody yet. */
export const voterServerSnapshot = () => INITIAL;

async function read(userId: string) {
  try {
    const [me, votes] = await callWithToken((auth) => Promise.all([getMe({ ...auth, cache: "no-store" }).then(unwrap), listMyVotes({ ...auth, cache: "no-store" }).then(unwrap)]));
    if (snapshot.userId === userId) set({ voter: { status: "ready", artistId: me.artist?.id ?? null, votes } });
  } catch (e) {
    if (snapshot.userId !== userId) return;
    // No token for this session (signed out elsewhere, expired): the visitor is invited to sign in again.
    if (e instanceof ApiError && e.status === 401) set({ voter: { status: "anonymous" } });
    else set({ voter: { status: "unknown", error: e instanceof ApiError ? e : null } });
  }
}

/** Says who is signed in (null: nobody). The reads start when the person changes, not on every call. */
export function identifyVoter(userId: string | null) {
  if (snapshot.userId === userId) return;
  if (userId === null) return set({ userId, voter: { status: "anonymous" } });
  set({ userId, voter: { status: "pending" } });
  void read(userId);
}

/** After a vote, or a refusal that says the votes we hold are stale: reads `votes/mine` again. */
export async function refreshVoter() {
  const { userId } = snapshot;
  if (typeof userId === "string") await read(userId);
}

/**
 * After a vote: reads the work again for its count, which `POST /votes` does not return. Public read,
 * sent without the token. A count never goes down (a vote cannot be withdrawn), so the highest known wins.
 */
export async function refreshCount(workId: string) {
  try {
    const work = unwrap(await getWork({ path: { work_id: workId }, cache: "no-store" }));
    if (work.votes > (snapshot.counts[workId] ?? -1)) set({ counts: { ...snapshot.counts, [workId]: work.votes } });
  } catch {
    // The count shown stays the one the page already has, plus the vote just cast.
  }
}

/** For tests: forgets everything. */
export function resetVoter() {
  snapshot = INITIAL;
}
