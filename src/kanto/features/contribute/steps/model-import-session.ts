import { useSyncExternalStore } from 'react';
import {
  createModelImport,
  type DisposableModelImport,
} from '@/features/model-import/create-model-import';
import {
  importModel,
  isImportableModel,
  type ImportedModel,
  type ImportStep,
} from '@/features/model-import/import-model';
import { errorCodeOf, stepsFor } from '@/features/model-import/import-state';
import type { ModelImportErrorCode } from '@/features/model-import/model-import-error';
import { api, errorMessage } from '../../../lib/api';
import type { Item, UploadProgress } from '../../../lib/api/types';

/*
 * The 3D model of a draft is prepared and sent from here, outside the media
 * step: the work goes on when the contributor moves to another step of the
 * wizard, and every step reads where it stands. One session per item and one
 * operation at a time: a new file takes the place of the one being prepared
 * or sent.
 */

/** Weight in bytes of the three files made from one scan. */
export interface ModelSizes {
  model1k: number;
  model2k: number;
  poster: number;
}

export type ModelImportState =
  | { phase: 'idle' }
  | {
      phase: 'preparing';
      fileName: string;
      steps: readonly ImportStep[];
      current: ImportStep | null;
    }
  /** The file cannot be used: nothing was sent. */
  | { phase: 'refused'; fileName: string; code: ModelImportErrorCode }
  /** Prepared, but a variant is above the upload limit: nothing was sent. */
  | {
      phase: 'oversized';
      fileName: string;
      variants: readonly ('1k' | '2k')[];
    }
  | { phase: 'sending'; fileName: string; progress: number }
  /** The prepared files are kept, so they can be sent again as they are. */
  | { phase: 'send-failed'; fileName: string; message: string }
  | {
      phase: 'attached';
      fileName: string;
      /** `model3d.variants.glb1k` of the item once this model was attached. */
      modelUrl: string;
      /** `null` for a .gltf, which goes up as it is. */
      sizes: ModelSizes | null;
    };

export interface ModelImportSession {
  getState(this: void): ModelImportState;
  subscribe(this: void, listener: () => void): () => void;
  /** Where the updated item goes; the last step that asked receives it. */
  connect(this: void, sink: (item: Item) => void): void;
  /**
   * Takes a file chosen as the 3D model: a .usdz or .glb scan is prepared in
   * the browser then attached, a .gltf goes up as it is, anything else is
   * refused. `create` builds the preparation pipeline (a web worker when left out).
   */
  start(this: void, file: File, create?: () => DisposableModelImport): void;
  /** Sends again the files of a failed upload, without preparing them again. */
  retry(this: void): void;
  /** Gives up the running operation and forgets the outcome of the last one. */
  reset(this: void): void;
}

type Listener = () => void;
type Sink = (item: Item) => void;

/** What goes to the server, kept until it is received. */
type Payload =
  | { kind: 'scan'; fileName: string; model: ImportedModel }
  | { kind: 'direct'; fileName: string; file: File };

const IDLE: ModelImportState = { phase: 'idle' };

function ratio(progress: UploadProgress): number {
  return progress.total === 0 ? 1 : progress.loaded / progress.total;
}

function createSession(itemId: string): ModelImportSession {
  const listeners = new Set<Listener>();
  let state: ModelImportState = IDLE;
  let sink: Sink | null = null;
  // The sink that received the last answer. Another one (the wizard was left
  // and opened again meanwhile) is handed the stored item when it connects.
  let answered: { to: Sink | null } | null = null;
  // Changes each time the running operation is replaced or given up: what an
  // older operation still reports is then left out of the state.
  let operation = 0;
  let pipeline: DisposableModelImport | null = null;
  let payload: Payload | null = null;
  let request: AbortController | null = null;
  // Settles when no request of this session is in flight.
  let flight: Promise<void> = Promise.resolve();

  function setState(next: ModelImportState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function deliver(item: Item): void {
    answered = { to: sink };
    sink?.(item);
  }

  function supersede(): number {
    operation += 1;
    pipeline?.dispose();
    pipeline = null;
    request?.abort();
    request = null;
    payload = null;
    return operation;
  }

  async function transmit(
    sent: Payload,
    onProgress: (progress: UploadProgress) => void,
    signal: AbortSignal,
  ): Promise<Item> {
    if (sent.kind === 'scan') {
      return api.items.attachModel(
        itemId,
        {
          sourceName: sent.fileName,
          model1k: sent.model.model1k,
          model2k: sent.model.model2k,
          poster: sent.model.poster,
        },
        onProgress,
        signal,
      );
    }
    // The upload route adds a media: the model this file replaces goes first,
    // so the item keeps one model.
    signal.throwIfAborted();
    const stored = await api.items.get(itemId);
    for (const media of stored.media) {
      if (media.kind === 'model') {
        signal.throwIfAborted();
        deliver(await api.items.removeMedia(itemId, media.id));
      }
    }
    signal.throwIfAborted();
    return api.items.uploadMedia(itemId, sent.file, {
      kind: 'model',
      onProgress,
    });
  }

  function send(current: number): void {
    const sent = payload;
    if (sent === null) {
      return;
    }
    const { fileName } = sent;
    const controller = new AbortController();
    request = controller;
    setState({ phase: 'sending', fileName, progress: 0 });
    // One request at a time: the previous one settles first, so the model
    // chosen last is also the last one the server receives.
    const answer = flight.then(() =>
      transmit(
        sent,
        (progress) => {
          if (operation === current) {
            setState({ phase: 'sending', fileName, progress: ratio(progress) });
          }
        },
        controller.signal,
      ),
    );
    flight = answer.then(
      () => undefined,
      () => undefined,
    );
    answer.then(
      (updated) => {
        // What the server stored is shown even when another file was chosen
        // while this one was on its way.
        deliver(updated);
        if (operation !== current) {
          return;
        }
        request = null;
        payload = null;
        setState({
          phase: 'attached',
          fileName,
          modelUrl: updated.model3d.variants?.glb1k ?? '',
          sizes:
            sent.kind === 'scan'
              ? {
                  model1k: sent.model.model1k.size,
                  model2k: sent.model.model2k.size,
                  poster: sent.model.poster.size,
                }
              : null,
        });
      },
      (error: unknown) => {
        if (operation !== current) {
          return;
        }
        request = null;
        setState({
          phase: 'send-failed',
          fileName,
          message: errorMessage(error),
        });
      },
    );
  }

  async function prepare(
    file: File,
    create: () => DisposableModelImport,
    current: number,
  ): Promise<void> {
    const fileName = file.name;
    const steps = stepsFor(file);
    let run: DisposableModelImport;
    try {
      run = create();
    } catch (error) {
      setState({ phase: 'refused', fileName, code: errorCodeOf(error) });
      return;
    }
    pipeline = run;
    setState({ phase: 'preparing', fileName, steps, current: null });
    try {
      const model = await importModel(file, run, (step) => {
        if (operation === current) {
          setState({ phase: 'preparing', fileName, steps, current: step });
        }
      });
      if (operation !== current) {
        return;
      }
      if (model.oversized.length > 0) {
        setState({ phase: 'oversized', fileName, variants: model.oversized });
        return;
      }
      payload = { kind: 'scan', fileName, model };
      send(current);
    } catch (error) {
      if (operation === current) {
        setState({ phase: 'refused', fileName, code: errorCodeOf(error) });
      }
    } finally {
      if (pipeline === run) {
        pipeline = null;
      }
      run.dispose();
    }
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    connect(next) {
      if (sink === next) {
        return;
      }
      sink = next;
      if (answered !== null && answered.to !== next) {
        answered = null;
        api.items.get(itemId).then(
          (item) => {
            if (sink === next) {
              next(item);
            }
          },
          () => undefined,
        );
      }
    },

    start(file, create = createModelImport) {
      const current = supersede();
      if (/\.gltf$/i.test(file.name)) {
        payload = { kind: 'direct', fileName: file.name, file };
        send(current);
        return;
      }
      if (!isImportableModel(file)) {
        setState({
          phase: 'refused',
          fileName: file.name,
          code: 'unsupported_format',
        });
        return;
      }
      void prepare(file, create, current);
    },

    retry() {
      if (state.phase !== 'send-failed' || payload === null) {
        return;
      }
      operation += 1;
      send(operation);
    },

    reset() {
      supersede();
      setState(IDLE);
    },
  };
}

const sessions = new Map<string, ModelImportSession>();

/** The session of an item, created on first use and kept for the page's life. */
export function modelImportSession(itemId: string): ModelImportSession {
  let session = sessions.get(itemId);
  if (session === undefined) {
    session = createSession(itemId);
    sessions.set(itemId, session);
  }
  return session;
}

/** True while a model is being prepared or sent. */
export function isModelImportBusy(state: ModelImportState): boolean {
  return state.phase === 'preparing' || state.phase === 'sending';
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function idleState(): ModelImportState {
  return IDLE;
}

/** Where the 3D model of an item stands; `null` (no draft yet) reads as idle. */
export function useModelImportState(itemId: string | null): ModelImportState {
  const session = itemId === null ? null : modelImportSession(itemId);
  return useSyncExternalStore(
    session?.subscribe ?? subscribeToNothing,
    session?.getState ?? idleState,
    session?.getState ?? idleState,
  );
}

/** Gives up every session. Tests start from a clean slate with it. */
export function resetModelImportSessions(): void {
  for (const session of sessions.values()) {
    session.reset();
  }
  sessions.clear();
}
