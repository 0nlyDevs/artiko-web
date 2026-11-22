import { isImportableModel } from "@/features/model-import/import-model";
import { MAX_UPLOAD_BYTES } from "@/features/model-import/limits";
import { MAX_PROOFS } from "@/features/artist-space/publish-body";

// What artiko-api accepts (app/platform/storage.py): the declared type must be one of these, and a file may
// weigh 20 MB at most (20 971 520 bytes are accepted, one more byte is answered 413). Checking here saves
// the artist a 20 MB upload that the API would refuse.
const MEDIA_TYPES: ReadonlyMap<string, MediaKind> = new Map([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["audio/mpeg", "audio"],
  ["audio/wav", "audio"],
  ["audio/x-wav", "audio"],
  ["audio/ogg", "audio"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
]);

/** `accept` of the work's file input: the media types, and the two 3D formats the browser prepares itself. */
export const ACCEPT_WORK = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb,.usdz";
/** `accept` of the proof file input: image, sound or video. */
export const ACCEPT_PROOF = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm";

export type MediaKind = "image" | "audio" | "video" | "model";
/** Why a file is refused before anything is sent. */
export type FileProblem = "empty" | "type" | "size";

/** Image, sound, video or 3D model, read from what the browser says of the file; null for anything else. */
export function mediaKind(file: File): MediaKind | null {
  if (isImportableModel(file)) return "model";
  return MEDIA_TYPES.get(file.type.toLowerCase()) ?? null;
}

/**
 * The file of the work. A `.usdz` or `.glb` scan is not weighed here: the 3D import has its own limits
 * (150 MB for the source, 20 MB for each file it produces) and says so itself.
 */
export function checkWorkFile(file: File): FileProblem | null {
  const kind = mediaKind(file);
  if (kind === null) return "type";
  if (kind === "model") return null;
  return checkSize(file);
}

/** A proof: an image, a sound or a video, 20 MB at most. The type is checked first, then the size. */
export function checkProofFile(file: File): FileProblem | null {
  const kind = mediaKind(file);
  if (kind === null || kind === "model") return "type";
  return checkSize(file);
}

function checkSize(file: File): FileProblem | null {
  if (file.size === 0) return "empty";
  return file.size > MAX_UPLOAD_BYTES ? "size" : null;
}

/** A proof as the form shows it: sent when it has no problem, kept on screen with its reason otherwise. */
export interface ProofItem {
  /** Stable across removals, for React keys and for « Remplacer ». */
  id: number;
  file: File;
  problem: FileProblem | null;
}

export const validProofs = (items: readonly ProofItem[]): File[] => items.filter((item) => item.problem === null).map((item) => item.file);

/** How many proofs can still be added: a file refused here takes no place. */
export const proofsLeft = (items: readonly ProofItem[]): number => Math.max(0, MAX_PROOFS - validProofs(items).length);

/**
 * Adds the chosen files to the proofs. Each is checked; a valid file beyond the fifth is left out and counted
 * in `overflow`, so the screen can say why it is missing. `replace` swaps the item of that id for the first file.
 */
export function addProofs(items: readonly ProofItem[], chosen: readonly File[], nextId: number, replace?: number): { items: ProofItem[]; overflow: number } {
  let id = nextId;
  let next = [...items];
  let files = [...chosen];
  if (replace !== undefined && files.length > 0) {
    const [first, ...rest] = files;
    const at = next.findIndex((item) => item.id === replace);
    const swapped: ProofItem = { id: id++, file: first, problem: checkProofFile(first) };
    if (at === -1) next.push(swapped);
    else next[at] = swapped;
    files = rest;
    // A refused file becoming valid may have taken the last place.
    next = trimValid(next);
  }
  let overflow = 0;
  for (const file of files) {
    const problem = checkProofFile(file);
    if (problem === null && proofsLeft(next) === 0) {
      overflow += 1;
      continue;
    }
    next.push({ id: id++, file, problem });
  }
  return { items: next, overflow };
}

/** Keeps the first five valid proofs; refused ones stay where they are. */
function trimValid(items: ProofItem[]): ProofItem[] {
  let valid = 0;
  return items.filter((item) => item.problem !== null || ++valid <= MAX_PROOFS);
}
