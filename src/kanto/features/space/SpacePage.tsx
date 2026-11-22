import { useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import {
  ClaimLabel,
  StateLabel,
} from '../../components/claim-label/ClaimLabel';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import {
  HallIntro,
  HallLayout,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import {
  api,
  errorMessage,
  errorRequestId,
  isMockApi,
  resetDemoData,
  useAsync,
} from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { session, useSession } from '../../lib/session/session';
import { RequireSession } from '../account/RequireSession';
import styles from './SpacePage.module.css';
import {
  MEDIUM_LABEL,
  formatDate,
  plural,
  sortByUpdated,
  thumbnailOf,
} from './space-format';

function Thumbnail({ item }: { item: Item }) {
  const [missing, setMissing] = useState(false);
  const thumbnail = thumbnailOf(item);
  return (
    <div className={styles.thumb} aria-hidden="true">
      {thumbnail !== null && !missing ? (
        <img
          src={thumbnail.url}
          alt=""
          loading="lazy"
          onError={() => {
            setMissing(true);
          }}
        />
      ) : (
        <span className={styles.thumbMissing}>Sans image</span>
      )}
    </div>
  );
}

interface RowProps {
  item: Item;
  onChanged: (item: Item) => void;
}

function SubmissionRow({ item, onChanged }: RowProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const published = item.publication === 'published';
  const state = item.review.state;

  async function withdraw(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.items.withdraw(item.id));
      setConfirming(false);
    } catch (caught: unknown) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={styles.row}>
      <Thumbnail item={item} />
      <div className={styles.body}>
        <div className={styles.head}>
          <h3 className={styles.title}>
            {published ? (
              <Link to={paths.item(item.id)}>{item.title}</Link>
            ) : (
              item.title
            )}
          </h3>
          <StateLabel review={state} publication={item.publication} />
        </div>
        <p className={styles.meta}>
          {MEDIUM_LABEL[item.medium]} · {item.depositNumber} · mis à jour le{' '}
          {formatDate(item.updatedAt)}
        </p>
        <div className={styles.labels}>
          <ClaimLabel status={item.review.itemClaims} scope="Œuvre" />
          <ClaimLabel
            status={item.review.descriptionClaims}
            scope="Description"
          />
        </div>
        {state === 'changes_requested' &&
          item.review.requestedChanges !== null && (
            <p className={styles.changes}>
              Corrections demandées : {item.review.requestedChanges}
            </p>
          )}
        {error !== null && (
          <StatusBanner tone="error" requestId={errorRequestId(error)}>
            {errorMessage(error)}
          </StatusBanner>
        )}
        <div className={styles.actions}>
          {state === 'not_submitted' && !published && (
            <Link className={styles.action} to={paths.wizard(item.id, 1)}>
              Reprendre
            </Link>
          )}
          {state === 'pending' && (
            <>
              <Link className={styles.action} to={paths.submission(item.id)}>
                Suivre
              </Link>
              {confirming ? (
                <span
                  className={styles.confirm}
                  role="group"
                  aria-label="Confirmer le retrait"
                >
                  Retirer de la relecture ?
                  <Button
                    size="small"
                    variant="secondary"
                    loading={busy}
                    onClick={() => {
                      void withdraw();
                    }}
                  >
                    Oui, retirer
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setConfirming(false);
                    }}
                  >
                    Annuler
                  </Button>
                </span>
              ) : (
                <button
                  type="button"
                  className={cx(styles.action, styles.quiet)}
                  onClick={() => {
                    setConfirming(true);
                  }}
                >
                  Retirer
                </button>
              )}
            </>
          )}
          {state === 'changes_requested' && (
            <Link className={styles.action} to={paths.wizard(item.id, 1)}>
              Corriger
            </Link>
          )}
          {state === 'rejected' && (
            <Link className={styles.action} to={paths.submission(item.id)}>
              Voir la décision
            </Link>
          )}
          {published && (
            <>
              <Link className={styles.action} to={paths.item(item.id)}>
                Voir dans le musée
              </Link>
              <Link className={styles.action} to={paths.verification(item.id)}>
                Certificat
              </Link>
            </>
          )}
          <Link
            className={cx(styles.action, styles.quiet)}
            to={paths.verification(item.id)}
          >
            Vérification
          </Link>
        </div>
      </div>
    </li>
  );
}

function SpaceContent() {
  const { account } = useSession();
  const items = useAsync('my-items', () => api.items.list({ owner: 'me' }));
  const [signingOut, setSigningOut] = useState(false);
  const list = items.data === null ? [] : sortByUpdated(items.data);
  const pending = list.filter((item) => item.review.state === 'pending').length;
  const published = list.filter(
    (item) => item.publication === 'published',
  ).length;
  const name = account?.displayName ?? '';

  async function signOut(): Promise<void> {
    setSigningOut(true);
    try {
      await session.signOut();
      navigate(paths.home);
    } finally {
      setSigningOut(false);
    }
  }

  const replace = (updated: Item): void => {
    if (items.data !== null) {
      items.setData(
        items.data.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
    }
  };

  return (
    <HallLayout currentPath={paths.space}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow="Mon espace"
            lines={['Bonjour,', `${name}.`]}
            lede={
              items.data === null
                ? 'Vos dépôts, leur relecture et leurs certificats.'
                : `${plural(list.length, 'dépôt', 'dépôts')} · ${plural(pending, 'en relecture', 'en relecture')} · ${plural(published, 'publiée', 'publiées')}.`
            }
          >
            <div className={styles.ctas}>
              <ButtonLink to={paths.contribute} variant="primary" withArrow>
                Déposer une œuvre
              </ButtonLink>
              <ButtonLink to={paths.profile} variant="secondary">
                Mon profil
              </ButtonLink>
            </div>
          </HallIntro>
        }
      >
        <section aria-labelledby="my-items-title">
          <h2 className="visually-hidden" id="my-items-title">
            Mes dépôts
          </h2>
          {items.status === 'loading' && items.data === null && (
            <div aria-busy="true" aria-label="Chargement des dépôts">
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          )}
          {items.status === 'error' && (
            <StatusBanner
              tone="error"
              requestId={errorRequestId(items.error)}
              action={{ label: 'Réessayer', onClick: items.reload }}
            >
              {errorMessage(items.error)}
            </StatusBanner>
          )}
          {items.data !== null && list.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Aucun dépôt pour l’instant.</p>
              <p className={styles.emptyText}>
                Décrivez une œuvre, ajoutez ses photographies ou un modèle 3D,
                puis envoyez-la en relecture.
              </p>
              <ButtonLink to={paths.contribute} variant="primary" withArrow>
                Déposer une œuvre
              </ButtonLink>
            </div>
          )}
          {list.length > 0 && (
            <ul className={styles.list}>
              {list.map((item) => (
                <SubmissionRow key={item.id} item={item} onChanged={replace} />
              ))}
            </ul>
          )}
        </section>
        <footer className={styles.footer}>
          <Button
            variant="secondary"
            size="small"
            loading={signingOut}
            onClick={() => {
              void signOut();
            }}
          >
            Se déconnecter
          </Button>
          {isMockApi && (
            <div className={styles.footerDemo}>
              <DemoBadge />
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  resetDemoData({ keepSession: true });
                  window.location.reload();
                }}
              >
                Réinitialiser les données de démonstration
              </Button>
            </div>
          )}
        </footer>
      </HallSplit>
    </HallLayout>
  );
}

/** `/mon-espace`: the contributor's deposits, their states and actions. */
export function SpacePage() {
  return (
    <RequireSession>
      <SpaceContent />
    </RequireSession>
  );
}
