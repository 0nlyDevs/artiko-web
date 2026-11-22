import { useEffect, useRef, useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import {
  HallIntro,
  HallLayout,
  HallSection,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import { QrCode } from '../../components/qr-code/QrCode';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { Tracker } from '../../components/tracker/Tracker';
import {
  api,
  errorMessage,
  errorRequestId,
  isMockApi,
  useAsync,
} from '../../lib/api';
import type { ScanSession } from '../../lib/api/types';
import { navigate } from '../../lib/router/router';
import { useSession } from '../../lib/session/session';
import { ArtworkViewer } from '../artwork-viewer';
import { RequireSession } from '../account/RequireSession';
import styles from './Scan.module.css';
import {
  STAGE_TEXT,
  TRANSPARENT_PIXEL,
  formatBytes,
  formatTime,
  trackerSteps,
} from './scan-stages';

export interface ScanDesktopPageProps {
  /** `null` on `/numerisation`: the page creates a session and moves to its address. */
  sessionId: string | null;
}

function itemFromSearch(): string | null {
  return new URLSearchParams(window.location.search).get('item');
}

/**
 * Desktop side of the capture handoff (brief, section D). The desktop opens
 * a session, the iPhone joins it from the QR code or the short code, the
 * capture happens in the native app, and the exported file comes back here.
 */
export function ScanDesktopPage({ sessionId }: ScanDesktopPageProps) {
  return (
    <RequireSession>
      <ScanDesktop sessionId={sessionId} />
    </RequireSession>
  );
}

function ScanDesktop({ sessionId }: ScanDesktopPageProps) {
  const { account } = useSession();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<unknown>(null);
  const creating = useRef(false);
  const effectiveId = sessionId ?? createdId;
  const itemId = itemFromSearch();

  useEffect(() => {
    if (effectiveId !== null || creating.current) {
      return;
    }
    creating.current = true;
    api.scan.create({ itemId }).then(
      (created) => {
        setCreatedId(created.id);
        navigate(`${paths.scan(created.id)}${window.location.search}`, {
          replace: true,
        });
      },
      (error: unknown) => {
        creating.current = false;
        setCreateError(error);
      },
    );
  }, [effectiveId, itemId]);

  const live = useAsync(
    `scan:${effectiveId ?? 'new'}`,
    () =>
      effectiveId === null ? Promise.resolve(null) : api.scan.get(effectiveId),
    effectiveId === null ? null : 1000,
  );
  const scan = live.data;

  if (createError !== null) {
    return (
      <HallLayout width="narrow">
        <HallIntro
          eyebrow="Scan 3D · session"
          lines={['Impossible', 'd’ouvrir', 'la session.']}
          compact
        />
        <StatusBanner
          tone="error"
          requestId={errorRequestId(createError)}
          action={{
            label: 'Réessayer',
            onClick: () => {
              setCreateError(null);
              creating.current = false;
            },
          }}
        >
          {errorMessage(createError)}
        </StatusBanner>
      </HallLayout>
    );
  }

  if (effectiveId !== null && live.status === 'error') {
    return (
      <HallLayout width="narrow">
        <HallIntro
          eyebrow="Scan 3D · session"
          lines={['Session', 'introuvable.']}
          compact
        />
        <StatusBanner tone="error" requestId={errorRequestId(live.error)}>
          {errorMessage(live.error)}
        </StatusBanner>
        <p className={styles.row}>
          <ButtonLink
            to={`${paths.scanNew}${window.location.search}`}
            variant="primary"
            withArrow
          >
            Ouvrir une nouvelle session
          </ButtonLink>
        </p>
      </HallLayout>
    );
  }

  return (
    <HallLayout currentPath={paths.scanNew}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow="Scan 3D · session"
            lines={['Scannez', 'l’objet avec', 'votre iPhone.']}
            lede="L’ordinateur ouvre la session, l’iPhone capture l’objet dans l’app native (Reality Composer ou l’app KANTO), puis le fichier revient ici pour être associé à la fiche."
          >
            {scan === null ? (
              <p className={styles.note} role="status">
                Ouverture de la session…
              </p>
            ) : (
              <Tracker steps={trackerSteps(scan)} />
            )}
          </HallIntro>
        }
      >
        {scan === null ? null : (
          <ScanBody
            scan={scan}
            itemId={itemId}
            displayName={account?.displayName ?? ''}
          />
        )}
      </HallSplit>
    </HallLayout>
  );
}

function ScanBody({
  scan,
  itemId,
  displayName,
}: {
  scan: ScanSession;
  itemId: string | null;
  displayName: string;
}) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<unknown>(null);
  const pairingUrl = `${window.location.origin}${scan.pairingPath}`;
  const closed = scan.stage === 'expired' || scan.stage === 'failed';

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  };

  const attach = async (): Promise<void> => {
    setAttaching(true);
    setAttachError(null);
    try {
      if (itemId !== null) {
        await api.scan.attach(scan.id, itemId);
        navigate(paths.wizard(itemId, 2));
        return;
      }
      const item = await api.items.create({
        title: 'Objet scanné',
        author: displayName,
        medium: 'sculpture',
        details: {},
        rights: {},
      });
      await api.scan.attach(scan.id, item.id);
      navigate(paths.wizard(item.id, 2));
    } catch (error) {
      setAttachError(error);
      setAttaching(false);
    }
  };

  return (
    <>
      {closed && (
        <StatusBanner tone={scan.stage === 'failed' ? 'error' : 'warning'}>
          {scan.stage === 'failed'
            ? (scan.error ?? STAGE_TEXT.failed)
            : 'Cette session a expiré après 30 minutes. Relancez-en une pour continuer.'}
        </StatusBanner>
      )}

      <HallSection number="01" title="Associer votre iPhone">
        <div className={styles.pairing}>
          <div className={styles.qrFrame}>
            <QrCode
              className={styles.qr}
              value={pairingUrl}
              size={200}
              label={`Code à scanner avec l’iPhone, session ${scan.code}`}
            />
          </div>
          <div className={styles.pairingText}>
            <p className={styles.codeLabel}>Ou saisissez ce code dans l’app</p>
            <p className={styles.code}>{scan.code}</p>
            <p className={styles.link}>{pairingUrl}</p>
            <div className={styles.row}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  void copyLink();
                }}
              >
                Copier le lien
              </Button>
              {copied === 'done' && (
                <span className={styles.note} role="status">
                  Lien copié.
                </span>
              )}
              {copied === 'failed' && (
                <span className={styles.note} role="status">
                  Copie impossible ici : sélectionnez le lien ci-dessus.
                </span>
              )}
            </div>
            <p className={styles.note}>
              Session valable jusqu’à {formatTime(scan.expiresAt)}.
            </p>
            {isMockApi && (
              <StatusBanner tone="info">
                Mode démonstration : la session se synchronise entre deux
                onglets du même navigateur. La synchronisation entre
                l’ordinateur et un vrai téléphone passe par l’API de session
                proposée dans docs/API-INTEGRATION.md.
              </StatusBanner>
            )}
          </div>
        </div>
      </HallSection>

      <HallSection number="02" title="État de la connexion">
        <div className={styles.status} aria-live="polite">
          <p className={styles.statusLine}>{STAGE_TEXT[scan.stage]}</p>
          {scan.device === null ? (
            <p className={styles.statusMeta}>
              Aucun appareil connecté pour l’instant.
            </p>
          ) : (
            <p className={styles.statusMeta}>
              {scan.device.name} · {scan.device.platform} · connecté à{' '}
              {formatTime(scan.device.connectedAt)}
            </p>
          )}
          {scan.stage === 'uploading' && (
            <div
              className={styles.progress}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(scan.progress * 100)}
              aria-label="Transfert du fichier"
            >
              <div
                className={styles.bar}
                style={{ width: `${String(Math.round(scan.progress * 100))}%` }}
              />
            </div>
          )}
        </div>
      </HallSection>

      <HallSection number="03" title="Fichier reçu">
        {scan.file === null ? (
          <p className={styles.note}>
            Le fichier exporté par l’app (USDZ, GLB ou glTF) apparaîtra ici dès
            sa réception.
          </p>
        ) : (
          <>
            <dl className={styles.file}>
              <dt>Nom</dt>
              <dd>{scan.file.name}</dd>
              <dt>Taille</dt>
              <dd>{formatBytes(scan.file.bytes)}</dd>
              <dt>Format</dt>
              <dd>{scan.file.kind.toUpperCase()}</dd>
            </dl>
            {scan.model3d?.status === 'ready' &&
              scan.model3d.variants !== null && (
                <div className={styles.viewer}>
                  <ArtworkViewer
                    poster={
                      scan.model3d.variants.poster === ''
                        ? TRANSPARENT_PIXEL
                        : scan.model3d.variants.poster
                    }
                    model1k={scan.model3d.variants.glb1k}
                    alt={`Aperçu du modèle ${scan.file.name}`}
                    bottomScanned={false}
                  />
                  <p className={styles.note}>
                    <DemoBadge
                      always
                      label="Aperçu local, fichier non encore stocké"
                    />
                  </p>
                </div>
              )}
            {scan.model3d?.status === 'processing' && (
              <StatusBanner tone="info">
                Reçu. La conversion en GLB se fait hors ligne (procédure 3D-04a)
                : l’aperçu sera disponible après préparation.
              </StatusBanner>
            )}
          </>
        )}
      </HallSection>

      {attachError !== null && (
        <StatusBanner tone="error" requestId={errorRequestId(attachError)}>
          {errorMessage(attachError)}
        </StatusBanner>
      )}

      <div className={styles.row}>
        {closed ? (
          <ButtonLink
            to={`${paths.scanNew}${window.location.search}`}
            variant="primary"
            withArrow
          >
            Relancer une session
          </ButtonLink>
        ) : (
          <Button
            variant="primary"
            withArrow
            loading={attaching}
            disabled={scan.model3d === null}
            onClick={() => {
              void attach();
            }}
          >
            {itemId !== null
              ? 'Associer à la fiche'
              : 'Créer la fiche à partir de ce scan'}
          </Button>
        )}
        <ButtonLink
          to={itemId === null ? paths.contribute : paths.wizard(itemId, 2)}
          variant="secondary"
        >
          Retour
        </ButtonLink>
      </div>
    </>
  );
}
