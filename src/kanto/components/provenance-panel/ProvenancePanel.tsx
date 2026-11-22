import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, errorMessage, errorRequestId } from '../../lib/api';
import { newId } from '../../lib/api/ids';
import type { Item, ProvenanceRecord } from '../../lib/api/types';
import { cx } from '../../lib/cx';
import { hasPermission, useSession } from '../../lib/session/session';
import { Button } from '../button/Button';
import { formatDateTime, shortenReference } from '../item-meta/item-meta';
import { StatusBanner } from '../status-banner/StatusBanner';
import styles from './ProvenancePanel.module.css';

export interface ProvenancePanelProps {
  item: Item;
  /** Receives every new record, so the parent can keep its copy of the item in step. */
  onChange?: ((provenance: ProvenanceRecord) => void) | undefined;
  /** Heading element of the panel. */
  as?: 'h2' | 'h3' | undefined;
}

const POLL_MS = 1000;

const STATUS_TEXT: Record<ProvenanceRecord['status'], string> = {
  none: 'Aucun certificat',
  pending: 'Inscription en cours',
  confirmed: 'Certificat inscrit',
  failed: 'Échec',
};

/** One idempotency key per item and browser session, reused on every retry (D16). */
function mintKey(itemId: string): string {
  const storageKey = `kanto.mint.${itemId}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing !== null && existing !== '') {
      return existing;
    }
    const fresh = newId();
    window.sessionStorage.setItem(storageKey, fresh);
    return fresh;
  } catch {
    return `${itemId}-mint`;
  }
}

/**
 * The provenance record of an item: what it establishes, its state, and the
 * mint action for the owner of a published item. A simulated record is
 * always labelled as such; the panel never calls an item "certifié" alone.
 */
export function ProvenancePanel({
  item,
  onChange,
  as: Heading = 'h2',
}: ProvenancePanelProps) {
  const { account } = useSession();
  const [provenance, setProvenance] = useState<ProvenanceRecord>(
    item.provenance,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  // A record handed down by the parent replaces the local copy.
  const [source, setSource] = useState({
    id: item.id,
    provenance: item.provenance,
  });
  if (source.id !== item.id || source.provenance !== item.provenance) {
    setSource({ id: item.id, provenance: item.provenance });
    setProvenance(item.provenance);
  }

  const pending = provenance.status === 'pending';
  useEffect(() => {
    if (!pending) {
      return;
    }
    let cancelled = false;
    const timer = window.setInterval(() => {
      api.items.provenance(item.id).then(
        (record) => {
          if (cancelled) {
            return;
          }
          setProvenance(record);
          if (record.status !== 'pending') {
            onChangeRef.current?.(record);
          }
        },
        (reason: unknown) => {
          if (!cancelled) {
            setError(reason);
          }
        },
      );
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pending, item.id]);

  const owner = account !== null && item.ownerId === account.accountId;
  const canMint =
    item.publication === 'published' &&
    (owner || hasPermission(account, 'admin'));

  const mint = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const record = await api.items.mint(item.id, mintKey(item.id));
      setProvenance(record);
      onChangeRef.current?.(record);
    } catch (reason: unknown) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  };

  const statusClass =
    provenance.status === 'pending'
      ? styles.statusPending
      : provenance.status === 'confirmed'
        ? styles.statusConfirmed
        : provenance.status === 'failed'
          ? styles.statusFailed
          : undefined;

  return (
    <section className={styles.panel} aria-labelledby={`provenance-${item.id}`}>
      <div className={styles.head}>
        <Heading id={`provenance-${item.id}`} className={styles.title}>
          Certificat de provenance
        </Heading>
        <span className={cx(styles.status, statusClass)}>
          {STATUS_TEXT[provenance.status]}
          {provenance.status === 'confirmed' &&
            provenance.simulated &&
            ' · simulé'}
        </span>
      </div>

      <p className={styles.scope}>{provenance.scope}</p>

      {provenance.status === 'confirmed' && provenance.simulated && (
        <StatusBanner tone="warning">
          Certificat simulé : aucune transaction réelle n’a été effectuée (mode
          démonstration).
        </StatusBanner>
      )}

      {provenance.status === 'confirmed' && (
        <dl className={styles.details}>
          <dt>Réseau</dt>
          <dd>{provenance.chain ?? '—'}</dd>
          <dt>Jeton</dt>
          <dd className={styles.mono}>{provenance.token ?? '—'}</dd>
          <dt>Transaction</dt>
          <dd
            className={styles.mono}
            title={provenance.transaction ?? undefined}
          >
            {provenance.transaction === null
              ? '—'
              : shortenReference(provenance.transaction)}
          </dd>
          <dt>Inscrit le</dt>
          <dd>{formatDateTime(provenance.mintedAt) || '—'}</dd>
          <dt>Fiche liée</dt>
          <dd className={styles.mono}>{item.depositNumber}</dd>
        </dl>
      )}

      {provenance.status === 'pending' && (
        <div className={styles.pending} role="status">
          Certificat en cours d’inscription…
          <span className={styles.bar} aria-hidden="true" />
          <span className={styles.scope}>
            Vous pouvez quitter la page : l’état reprend au retour. Aucune
            nouvelle demande n’est envoyée tant que celle-ci est en attente.
          </span>
        </div>
      )}

      {provenance.status === 'failed' && (
        <StatusBanner tone="error">
          {provenance.failureMessage ??
            'L’inscription du certificat a échoué. La fiche reste consultable.'}
        </StatusBanner>
      )}

      {error !== null && (
        <StatusBanner tone="error" requestId={errorRequestId(error)}>
          {errorMessage(error)}
        </StatusBanner>
      )}

      {(provenance.status === 'none' || provenance.status === 'failed') &&
        (canMint ? (
          <div className={styles.actions}>
            <Button
              variant="primary"
              loading={busy}
              disabled={pending}
              onClick={() => {
                void mint();
              }}
            >
              {provenance.status === 'failed'
                ? 'Réessayer l’inscription'
                : 'Créer le certificat de provenance'}
            </Button>
            <span className={styles.guest}>
              Réservé au déposant d’une œuvre publiée.
            </span>
          </div>
        ) : (
          <p className={styles.guest}>
            {item.publication === 'published'
              ? 'Le déposant de l’œuvre peut créer le certificat depuis son espace.'
              : 'Le certificat se crée une fois l’œuvre relue et publiée.'}
          </p>
        ))}
    </section>
  );
}
