import { useState } from 'react';
import { Button } from '../../components/button/Button';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { DropZone } from '../../components/drop-zone/DropZone';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import {
  api,
  errorMessage,
  errorRequestId,
  isMockApi,
  useAsync,
} from '../../lib/api';
import type { ScanSession } from '../../lib/api/types';
import styles from './Scan.module.css';
import { STAGE_TEXT, deviceFromUserAgent, formatBytes } from './scan-stages';

export interface ScanPhonePageProps {
  sessionId: string;
}

/**
 * Phone side of the handoff. It connects the device to the session, reports
 * where the capture stands and transfers the file the native app exported.
 * It captures nothing itself: the browser has no access to the LiDAR sensor.
 */
export function ScanPhonePage({ sessionId }: ScanPhonePageProps) {
  const live = useAsync(
    `scan-phone:${sessionId}`,
    () => api.scan.get(sessionId),
    1500,
  );
  const [busy, setBusy] = useState<'connect' | 'scanning' | 'upload' | null>(
    null,
  );
  const [progress, setProgress] = useState(0);
  const [actionError, setActionError] = useState<unknown>(null);

  const run = async (
    kind: 'connect' | 'scanning' | 'upload',
    action: () => Promise<ScanSession>,
  ): Promise<void> => {
    setBusy(kind);
    setActionError(null);
    try {
      live.setData(await action());
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(null);
    }
  };

  if (live.status === 'error') {
    return (
      <HallLayout width="narrow">
        <HallIntro
          eyebrow="Scan 3D · téléphone"
          lines={['Session', 'introuvable.']}
          compact
        />
        <StatusBanner tone="error" requestId={errorRequestId(live.error)}>
          {errorMessage(live.error)}
        </StatusBanner>
      </HallLayout>
    );
  }
  const scan = live.data;
  if (scan === null) {
    return (
      <HallLayout width="narrow">
        <p className={styles.note} role="status">
          Connexion à la session…
        </p>
      </HallLayout>
    );
  }

  const closed = scan.stage === 'expired' || scan.stage === 'failed';
  const connected = scan.device !== null && scan.stage !== 'created';
  const uploaded = scan.file !== null && scan.stage !== 'uploading';

  return (
    <HallLayout width="narrow">
      <div className={styles.phoneHeader}>
        <HallIntro
          eyebrow={`Scan 3D · session ${scan.code}`}
          lines={['Capturez', 'puis déposez', 'le fichier.']}
          lede="Cette page ne capture rien elle-même : la numérisation se fait dans l’app native de l’iPhone. Elle relie le téléphone à la session ouverte sur l’ordinateur et transfère le fichier exporté."
          compact
        />
        {isMockApi && <DemoBadge />}
      </div>

      {closed && (
        <StatusBanner tone={scan.stage === 'failed' ? 'error' : 'warning'}>
          {scan.stage === 'failed'
            ? (scan.error ?? STAGE_TEXT.failed)
            : 'Cette session a expiré. Relancez-la depuis l’ordinateur.'}
        </StatusBanner>
      )}

      {actionError !== null && (
        <StatusBanner tone="error" requestId={errorRequestId(actionError)}>
          {errorMessage(actionError)}
        </StatusBanner>
      )}

      <div className={styles.stack}>
        {!connected && !closed && (
          <section className={styles.status}>
            <p className={styles.statusLine}>1 · Connecter ce téléphone</p>
            <p className={styles.statusMeta}>
              L’ordinateur verra ce téléphone apparaître dans la session.
            </p>
            <div>
              <Button
                variant="primary"
                withArrow
                loading={busy === 'connect'}
                onClick={() => {
                  const device = deviceFromUserAgent(navigator.userAgent);
                  void run('connect', () =>
                    api.scan.connect(sessionId, {
                      ...device,
                      connectedAt: new Date().toISOString(),
                    }),
                  );
                }}
              >
                Connecter ce téléphone
              </Button>
            </div>
          </section>
        )}

        {connected && !closed && !uploaded && (
          <>
            <section className={styles.status}>
              <p className={styles.statusLine}>2 · Capturer dans l’app</p>
              <ol className={styles.steps}>
                <li>
                  Ouvrez Reality Composer (ou l’app KANTO) et capturez l’objet.
                </li>
                <li>Exportez le fichier USDZ ou GLB.</li>
                <li>Déposez-le ci-dessous.</li>
              </ol>
              {scan.stage !== 'scanning' && scan.stage !== 'uploading' && (
                <div>
                  <Button
                    variant="secondary"
                    size="small"
                    loading={busy === 'scanning'}
                    onClick={() => {
                      void run('scanning', () =>
                        api.scan.setStage(sessionId, 'scanning', 0),
                      );
                    }}
                  >
                    J’ai commencé la capture dans l’app
                  </Button>
                </div>
              )}
              {scan.stage === 'scanning' && (
                <p className={styles.statusMeta} role="status">
                  L’ordinateur affiche « capture en cours ».
                </p>
              )}
            </section>

            <section className={styles.status}>
              <p className={styles.statusLine}>
                3 · Transférer le fichier exporté
              </p>
              <DropZone
                title="Déposez le fichier USDZ ou GLB"
                hint="USDZ, GLB ou glTF · export de l’app de capture"
                accept=".usdz,.glb,.gltf"
                multiple={false}
                disabled={busy !== null}
                busy={
                  busy === 'upload'
                    ? {
                        label: `Transfert… ${String(Math.round(progress * 100))} %`,
                        progress,
                      }
                    : undefined
                }
                onFiles={(files) => {
                  const file = files[0];
                  if (file === undefined) {
                    return;
                  }
                  setProgress(0);
                  void run('upload', () =>
                    api.scan.upload(sessionId, file, (update) => {
                      setProgress(
                        update.total === 0 ? 1 : update.loaded / update.total,
                      );
                    }),
                  );
                }}
              />
            </section>
          </>
        )}

        {uploaded && scan.file !== null && (
          <section className={styles.status} aria-live="polite">
            <p className={styles.statusLine}>
              {scan.stage === 'failed'
                ? 'Fichier refusé.'
                : 'Fichier reçu : retrouvez-le sur l’ordinateur.'}
            </p>
            <p className={styles.statusMeta}>
              {scan.file.name} · {formatBytes(scan.file.bytes)} ·{' '}
              {STAGE_TEXT[scan.stage]}
            </p>
          </section>
        )}
      </div>
    </HallLayout>
  );
}
