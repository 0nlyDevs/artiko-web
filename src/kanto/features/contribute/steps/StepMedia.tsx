import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DisposableModelImport } from '@/features/model-import/create-model-import';
import { DropZone } from '../../../components/drop-zone/DropZone';
import { HallSection } from '../../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../../components/status-banner/StatusBanner';
import { api, errorMessage } from '../../../lib/api';
import type { Item, MediaKind } from '../../../lib/api/types';
import { cx } from '../../../lib/cx';
import { Link } from '../../../lib/router/Link';
import { paths } from '../../../app/routes';
import { ArtworkViewer } from '../../artwork-viewer';
import {
  AUDIO_ACCEPT,
  formatBytes,
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  MODEL_ACCEPT,
  TRANSPARENT_PIXEL,
  VIDEO_ACCEPT,
} from '../contribute-content';
import {
  canChooseAnotherFile,
  IMPORT_CANCELLED,
  IMPORT_MODEL_GONE,
  IMPORT_SEND_FAILED,
  importAnnouncement,
  importErrorMessage,
  importOversizedMessage,
} from '../model-import-copy';
import styles from '../WizardPage.module.css';
import { useModelAvailability } from './model-availability';
import {
  modelImportSession,
  useModelImportState,
} from './model-import-session';
import {
  ImportProgress,
  ImportSizes,
  ImportUpload,
} from './ModelImportStatus';

export interface StepMediaProps {
  item: Item;
  onItem: (item: Item) => void;
  /** Entered through "Importer un modèle 3D": highlights the model button. */
  mode3d: boolean;
  /**
   * Builds the pipeline that prepares a scan (USDZ or GLB) in the browser.
   * Left out, it runs in a web worker; tests pass a fake one.
   */
  createModelImport?: (() => DisposableModelImport) | undefined;
}

interface PendingUpload {
  localId: string;
  name: string;
  bytes: number;
  kind: MediaKind;
  progress: number;
  status: 'uploading' | 'error';
  error: string | null;
  cancelled: boolean;
}

const KIND_LABEL: Record<MediaKind, string> = {
  image: 'Image',
  video: 'Vidéo',
  audio: 'Son',
  model: 'Modèle 3D',
};

/** Step 2, Figma B2: photographs first, then video, sound or a 3D model. */
export function StepMedia({
  item,
  onItem,
  mode3d,
  createModelImport,
}: StepMediaProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const itemRef = useRef(item);
  useLayoutEffect(() => {
    itemRef.current = item;
  });
  const localCounter = useRef(0);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const modelButton = useRef<HTMLButtonElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replacing = useRef<string | null>(null);

  // The 3D model is prepared and sent by a session that outlives this step: a
  // scan (USDZ from a LiDAR capture, or a GLB) is converted and optimized in
  // the browser then attached, and leaving for another step of the wizard
  // does not interrupt it.
  const modelSession = modelImportSession(item.id);
  const importState = useModelImportState(item.id);
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    modelSession.connect(onItem);
  }, [modelSession, onItem]);

  const patchPending = (
    localId: string,
    patch: Partial<PendingUpload>,
  ): void => {
    setPending((list) =>
      list.map((entry) =>
        entry.localId === localId ? { ...entry, ...patch } : entry,
      ),
    );
  };
  const dropPending = (localId: string): void => {
    setPending((list) => list.filter((entry) => entry.localId !== localId));
  };

  const startUpload = (file: File, kind: MediaKind): void => {
    localCounter.current += 1;
    const localId = `local-${String(localCounter.current)}`;
    if (kind === 'image' && file.size > MAX_IMAGE_BYTES) {
      setPending((list) => [
        ...list,
        {
          localId,
          name: file.name,
          bytes: file.size,
          kind,
          progress: 0,
          status: 'error',
          error: `Fichier trop lourd (${formatBytes(file.size)}). Réduisez-le sous 40 Mo.`,
          cancelled: false,
        },
      ]);
      return;
    }
    setPending((list) => [
      ...list,
      {
        localId,
        name: file.name,
        bytes: file.size,
        kind,
        progress: 0,
        status: 'uploading',
        error: null,
        cancelled: false,
      },
    ]);
    const before = new Set(itemRef.current.media.map((media) => media.id));
    api.items
      .uploadMedia(itemRef.current.id, file, {
        kind,
        onProgress: (progress) => {
          patchPending(localId, {
            progress:
              progress.total === 0 ? 1 : progress.loaded / progress.total,
          });
        },
      })
      .then(async (updated) => {
        const wasCancelled = cancelledRef.current.has(localId);
        if (wasCancelled) {
          const added = updated.media.find(
            (media) => !before.has(media.id) && media.name === file.name,
          );
          const reverted =
            added === undefined
              ? updated
              : await api.items.removeMedia(updated.id, added.id);
          cancelledRef.current.delete(localId);
          onItem(reverted);
        } else {
          onItem(updated);
        }
        dropPending(localId);
      })
      .catch((error: unknown) => {
        patchPending(localId, { status: 'error', error: errorMessage(error) });
      });
  };
  const cancelledRef = useRef(new Set<string>());

  const cancelUpload = (localId: string): void => {
    cancelledRef.current.add(localId);
    patchPending(localId, { cancelled: true });
  };

  const run = (action: Promise<Item>): void => {
    setFailure(null);
    action.then(onItem, (error: unknown) => {
      setFailure(errorMessage(error));
    });
  };

  const removeExtra = (mediaId: string): void => {
    setFailure(null);
    api.items.removeMedia(item.id, mediaId).then(
      (updated) => {
        onItem(updated);
        // The import state describes the model it attached and goes with it.
        // A replacement being prepared or sent is not attached yet: removing
        // the previous model leaves it alone.
        const state = modelSession.getState();
        if (
          state.phase === 'attached' &&
          updated.model3d.variants?.glb1k !== state.modelUrl
        ) {
          modelSession.reset();
        }
      },
      (error: unknown) => {
        setFailure(errorMessage(error));
      },
    );
  };

  const chooseModel = (file: File): void => {
    setFailure(null);
    setCancelled(false);
    // The session prepares a scan, sends a .gltf as it is and refuses the rest.
    modelSession.start(file, createModelImport);
  };

  // The panel or the banner that carries one of these actions goes away with
  // it: the focus moves first to a control that stays on the page.
  const pickModel = (): void => {
    modelButton.current?.focus();
    modelInput.current?.click();
  };
  const cancelImport = (): void => {
    modelSession.reset();
    setCancelled(true);
    modelButton.current?.focus();
  };
  const retrySend = (): void => {
    modelButton.current?.focus();
    modelSession.retry();
  };
  const dismissRefusal = (): void => {
    modelButton.current?.focus();
    modelSession.reset();
  };

  const images = item.media.filter(
    (media) => media.kind === 'image' && media.status === 'ready',
  );
  const others = item.media.filter(
    (media) => media.kind !== 'image' && media.status === 'ready',
  );
  const uploadingImages = pending.filter(
    (entry) =>
      entry.kind === 'image' &&
      entry.status === 'uploading' &&
      !entry.cancelled,
  );
  const busy =
    uploadingImages.length === 0
      ? undefined
      : {
          label: `Envoi de ${String(uploadingImages.length)} fichier${uploadingImages.length > 1 ? 's' : ''}…`,
          progress:
            uploadingImages.reduce(
              (total, entry) => total + entry.progress,
              0,
            ) / uploadingImages.length,
        };
  const primaryImage = images.find((media) => media.primary) ?? images[0];
  const modelVariants =
    item.model3d.status === 'ready' ? item.model3d.variants : null;
  const modelPoster =
    modelVariants !== null && modelVariants.poster !== ''
      ? modelVariants.poster
      : (primaryImage?.url ?? TRANSPARENT_PIXEL);
  // A draft opened again may point to a file of an earlier session.
  const modelAvailability = useModelAvailability(modelVariants?.glb1k ?? null);
  // "Attached" and the weights describe the model this session sent, and only
  // while it is still the model of the item.
  const attachedModel =
    importState.phase === 'attached' &&
    modelVariants !== null &&
    modelVariants.glb1k === importState.modelUrl
      ? importState
      : null;
  const importedSizes = attachedModel?.sizes ?? null;
  const announcement =
    importState.phase === 'idle'
      ? cancelled
        ? IMPORT_CANCELLED
        : ''
      : importState.phase === 'attached' && attachedModel === null
        ? ''
        : importAnnouncement(importState);

  return (
    <div className={styles.form}>
      {failure !== null && (
        <StatusBanner
          tone="error"
          className={styles.banner}
          action={{
            label: 'Fermer',
            onClick: () => {
              setFailure(null);
            },
          }}
        >
          {failure}
        </StatusBanner>
      )}
      <HallSection number="01" title="Images de l’œuvre">
        <DropZone
          title="Glissez vos images ici"
          hint="JPG, PNG ou HEIC · 40 Mo max · 3 000 px minimum conseillés"
          accept={IMAGE_ACCEPT}
          busy={busy}
          onFiles={(files) => {
            for (const file of files) {
              startUpload(file, 'image');
            }
          }}
        />
        {(images.length > 0 ||
          pending.some((entry) => entry.kind === 'image')) && (
          <ul className={cx(styles.mediaGrid)} aria-label="Images ajoutées">
            {images.map((media) => (
              <li key={media.id}>
                <figure className={styles.thumb}>
                  <div className={styles.thumbImage}>
                    <img src={media.url} alt={media.name} />
                    {media.primary && (
                      <span className={styles.thumbTag}>Image principale</span>
                    )}
                  </div>
                  <figcaption className={styles.thumbName}>
                    {media.name}
                  </figcaption>
                  <span className={styles.thumbMeta}>
                    {media.width !== null && media.height !== null
                      ? `${String(media.width)} × ${String(media.height)} px`
                      : 'Dimensions inconnues'}
                    {media.bytes > 0 && ` · ${formatBytes(media.bytes)}`}
                    {!media.persistent &&
                      ' · conservée pour cette session seulement'}
                  </span>
                  <span className={styles.thumbActions}>
                    {!media.primary && (
                      <button
                        type="button"
                        className={styles.textAction}
                        onClick={() => {
                          run(api.items.setPrimaryMedia(item.id, media.id));
                        }}
                      >
                        Définir comme principale
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.textAction}
                      onClick={() => {
                        run(api.items.removeMedia(item.id, media.id));
                      }}
                    >
                      Retirer
                    </button>
                  </span>
                </figure>
              </li>
            ))}
            {pending
              .filter((entry) => entry.kind === 'image')
              .map((entry) => (
                <li key={entry.localId}>
                  <figure
                    className={cx(
                      styles.thumb,
                      entry.status === 'uploading' && styles.thumbUploading,
                    )}
                  >
                    <div
                      className={cx(
                        styles.thumbImage,
                        entry.status === 'error' && styles.thumbErrorBox,
                      )}
                      aria-hidden="true"
                    >
                      {entry.status === 'error' ? '!' : ''}
                    </div>
                    <figcaption className={styles.thumbName}>
                      {entry.name}
                    </figcaption>
                    {entry.status === 'uploading' ? (
                      <>
                        <span
                          className={cx(styles.thumbMeta, styles.thumbProgress)}
                          role="status"
                        >
                          {entry.cancelled
                            ? 'Annulation…'
                            : `Envoi… ${String(Math.round(entry.progress * 100))} %`}
                        </span>
                        <span
                          className={styles.progressLine}
                          aria-hidden="true"
                        >
                          <span
                            className={styles.progressBar}
                            style={{
                              width: `${String(Math.round(entry.progress * 100))}%`,
                            }}
                          />
                        </span>
                        {!entry.cancelled && (
                          <span className={styles.thumbActions}>
                            <button
                              type="button"
                              className={styles.textAction}
                              onClick={() => {
                                cancelUpload(entry.localId);
                              }}
                            >
                              Annuler
                            </button>
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span
                          className={cx(
                            styles.thumbMeta,
                            styles.thumbMetaError,
                          )}
                          role="alert"
                        >
                          {entry.error}
                        </span>
                        <span className={styles.thumbActions}>
                          <button
                            type="button"
                            className={styles.textAction}
                            onClick={() => {
                              replacing.current = entry.localId;
                              replaceInput.current?.click();
                            }}
                          >
                            Remplacer
                          </button>
                          <button
                            type="button"
                            className={styles.textAction}
                            onClick={() => {
                              dropPending(entry.localId);
                            }}
                          >
                            Retirer
                          </button>
                        </span>
                      </>
                    )}
                  </figure>
                </li>
              ))}
          </ul>
        )}
      </HallSection>

      <HallSection number="02" title="Selon la forme d’art (facultatif)">
        <div className={styles.extraButtons}>
          <button
            type="button"
            className={styles.extraButton}
            onClick={() => {
              videoInput.current?.click();
            }}
          >
            <span className={styles.extraTitle}>+ Vidéo</span>
            <span className={styles.extraMeta}>MP4 · geste, atelier</span>
          </button>
          <button
            type="button"
            className={styles.extraButton}
            onClick={() => {
              audioInput.current?.click();
            }}
          >
            <span className={styles.extraTitle}>+ Son</span>
            <span className={styles.extraMeta}>MP3, WAV · musique, récit</span>
          </button>
          <button
            ref={modelButton}
            type="button"
            className={cx(styles.extraButton, mode3d && styles.extraHighlight)}
            onClick={() => {
              modelInput.current?.click();
            }}
          >
            <span className={styles.extraTitle}>+ Modèle 3D</span>
            <span className={styles.extraMeta}>
              USDZ, GLB, glTF · scan LiDAR, sculpture numérisée
            </span>
          </button>
        </div>
        {(others.length > 0 ||
          pending.some((entry) => entry.kind !== 'image')) && (
          <ul className={styles.extraList} aria-label="Autres médias">
            {others.map((media) => (
              <li key={media.id} className={styles.extraRow}>
                <span className={styles.extraKind}>
                  {KIND_LABEL[media.kind]}
                </span>
                <span className={styles.extraName}>{media.name}</span>
                <span className={styles.thumbMeta}>
                  {media.bytes > 0 ? formatBytes(media.bytes) : ''}
                  {!media.persistent && ' · cette session'}
                </span>
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() => {
                    removeExtra(media.id);
                  }}
                >
                  Retirer
                </button>
              </li>
            ))}
            {pending
              .filter((entry) => entry.kind !== 'image')
              .map((entry) => (
                <li key={entry.localId} className={styles.extraRow}>
                  <span className={styles.extraKind}>
                    {KIND_LABEL[entry.kind]}
                  </span>
                  <span className={styles.extraName}>{entry.name}</span>
                  {entry.status === 'uploading' ? (
                    <span
                      className={cx(styles.thumbMeta, styles.thumbProgress)}
                      role="status"
                    >
                      Envoi… {String(Math.round(entry.progress * 100))} %
                    </span>
                  ) : (
                    <>
                      <span
                        className={cx(styles.thumbMeta, styles.thumbMetaError)}
                        role="alert"
                      >
                        {entry.error}
                      </span>
                      <button
                        type="button"
                        className={styles.textAction}
                        onClick={() => {
                          dropPending(entry.localId);
                        }}
                      >
                        Retirer
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>
        )}
        {/* The one live region of the import: a sentence per change. */}
        <p
          className={
            importState.phase === 'idle' && cancelled
              ? styles.importNote
              : 'visually-hidden'
          }
          role="status"
        >
          {announcement}
        </p>
        {importState.phase === 'preparing' && (
          <ImportProgress
            fileName={importState.fileName}
            steps={importState.steps}
            current={importState.current}
            onCancel={cancelImport}
          />
        )}
        {importState.phase === 'refused' && (
          <StatusBanner
            tone="error"
            className={styles.importBanner}
            action={
              canChooseAnotherFile(importState.code)
                ? { label: 'Choisir un autre fichier', onClick: pickModel }
                : { label: 'Fermer', onClick: dismissRefusal }
            }
          >
            <span className={styles.importFile}>{importState.fileName}</span>
            {importErrorMessage(importState.code)}
          </StatusBanner>
        )}
        {importState.phase === 'oversized' && (
          <StatusBanner
            tone="error"
            className={styles.importBanner}
            action={{ label: 'Choisir un autre fichier', onClick: pickModel }}
          >
            <span className={styles.importFile}>{importState.fileName}</span>
            {importOversizedMessage(importState.variants)}
          </StatusBanner>
        )}
        {importState.phase === 'sending' && (
          <ImportUpload
            fileName={importState.fileName}
            progress={importState.progress}
          />
        )}
        {importState.phase === 'send-failed' && (
          <StatusBanner
            tone="error"
            className={styles.importBanner}
            action={{ label: 'Réessayer l’envoi', onClick: retrySend }}
          >
            <span className={styles.importFile}>{importState.fileName}</span>
            {IMPORT_SEND_FAILED} {importState.message}
          </StatusBanner>
        )}
        {modelVariants !== null && modelAvailability === 'gone' && (
          <StatusBanner
            tone="warning"
            className={styles.importBanner}
            action={{ label: 'Importer de nouveau', onClick: pickModel }}
          >
            {IMPORT_MODEL_GONE}
          </StatusBanner>
        )}
        {modelVariants !== null && modelAvailability === 'available' && (
          <div className={styles.viewer}>
            <ArtworkViewer
              poster={modelPoster}
              model1k={modelVariants.glb1k}
              {...(modelVariants.glb2k !== null
                ? { model2k: modelVariants.glb2k }
                : {})}
              alt={item.title === '' ? 'Modèle 3D importé' : item.title}
              bottomScanned={false}
            />
          </div>
        )}
        {importedSizes !== null && modelAvailability === 'available' && (
          <ImportSizes sizes={importedSizes} />
        )}
        {item.model3d.status === 'processing' && (
          <StatusBanner className={styles.importBanner}>
            Conversion hors ligne requise : ce fichier USDZ sera préparé par
            l’équipe 3D (modèle standard, modèle HD et image d’attente) avant
            d’être visible dans la salle.
          </StatusBanner>
        )}
        <p className={styles.scanLink}>
          Vous avez l’objet sous la main ?{' '}
          <Link to={`${paths.scanNew}?item=${encodeURIComponent(item.id)}`}>
            Scanner avec mon iPhone
          </Link>
        </p>
        <input
          ref={videoInput}
          className={styles.hidden}
          type="file"
          accept={VIDEO_ACCEPT}
          aria-label="Ajouter une vidéo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              startUpload(file, 'video');
            }
            event.target.value = '';
          }}
        />
        <input
          ref={audioInput}
          className={styles.hidden}
          type="file"
          accept={AUDIO_ACCEPT}
          aria-label="Ajouter un son"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              startUpload(file, 'audio');
            }
            event.target.value = '';
          }}
        />
        <input
          ref={modelInput}
          className={styles.hidden}
          type="file"
          accept={MODEL_ACCEPT}
          aria-label="Ajouter un modèle 3D"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              chooseModel(file);
            }
            event.target.value = '';
          }}
        />
        <input
          ref={replaceInput}
          className={styles.hidden}
          type="file"
          accept={IMAGE_ACCEPT}
          aria-label="Remplacer une image"
          onChange={(event) => {
            const file = event.target.files?.[0];
            const target = replacing.current;
            replacing.current = null;
            if (target !== null) {
              dropPending(target);
            }
            if (file !== undefined) {
              startUpload(file, 'image');
            }
            event.target.value = '';
          }}
        />
      </HallSection>
    </div>
  );
}
