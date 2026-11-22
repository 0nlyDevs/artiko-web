import { useState } from 'react';
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
  HallSection,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import {
  ACTOR_LABEL,
  OUTCOME_LABEL,
  formatDateTime,
} from '../../components/item-meta/item-meta';
import { ProvenancePanel } from '../../components/provenance-panel/ProvenancePanel';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { Tracker } from '../../components/tracker/Tracker';
import type { TrackerStep } from '../../components/tracker/Tracker';
import {
  api,
  errorMessage,
  errorRequestId,
  isApiError,
  useAsync,
} from '../../lib/api';
import type { Item, VerificationSignal } from '../../lib/api/types';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { hasPermission, useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import styles from './VerificationPage.module.css';

export interface VerificationPageProps {
  itemId: string;
}

const POLL_MS = 700;

const CHECKS = [
  'Analyse des métadonnées : les champs de la notice sont-ils renseignés ?',
  'Détection de contenu généré par IA sur les images.',
  'Cohérence entre la description et les médias.',
  'Contrôle de provenance : lien déclaré, détenteur, consentements.',
  'Recherche de doublon dans la collection.',
] as const;

function trackerSteps(item: Item): TrackerStep[] {
  const { verification, review, publication, provenance } = item;
  const analysis: TrackerStep = {
    title: 'Analyse assistée',
    detail:
      verification.status === 'done'
        ? `Terminée le ${formatDateTime(verification.completedAt)}`
        : verification.status === 'running'
          ? 'En cours'
          : verification.status === 'failed'
            ? 'Échec'
            : 'À lancer',
    state:
      verification.status === 'done'
        ? 'done'
        : verification.status === 'running'
          ? 'active'
          : verification.status === 'failed'
            ? 'failed'
            : 'upcoming',
  };
  const humanReview: TrackerStep = {
    title: 'Relecture humaine',
    detail:
      review.state === 'approved'
        ? 'Acceptée'
        : review.state === 'rejected'
          ? 'Refusée'
          : review.state === 'changes_requested'
            ? 'Corrections demandées'
            : review.state === 'pending'
              ? 'Dans la file de relecture'
              : 'Après l’envoi en relecture',
    state:
      review.state === 'approved'
        ? 'done'
        : review.state === 'rejected'
          ? 'failed'
          : review.state === 'pending' || review.state === 'changes_requested'
            ? 'active'
            : 'upcoming',
  };
  const published: TrackerStep = {
    title: 'Publication',
    detail:
      publication === 'published'
        ? 'Exposée dans le musée'
        : publication === 'unpublished'
          ? 'Retirée du musée'
          : review.state === 'rejected'
            ? 'Sans suite'
            : 'Automatique après une relecture acceptée',
    state:
      publication === 'published'
        ? 'done'
        : publication === 'unpublished' || review.state === 'rejected'
          ? 'failed'
          : review.state === 'approved'
            ? 'active'
            : 'upcoming',
  };
  const certificate: TrackerStep = {
    title: 'Certificat de provenance',
    detail:
      provenance.status === 'confirmed'
        ? provenance.simulated
          ? 'Inscrit (simulation)'
          : 'Inscrit'
        : provenance.status === 'pending'
          ? 'Inscription en cours'
          : provenance.status === 'failed'
            ? 'Échec de l’inscription'
            : 'Sur demande du déposant, après publication',
    state:
      provenance.status === 'confirmed'
        ? 'done'
        : provenance.status === 'pending'
          ? 'active'
          : provenance.status === 'failed'
            ? 'failed'
            : 'upcoming',
  };
  return [analysis, humanReview, published, certificate];
}

function SignalRow({ signal }: { signal: VerificationSignal }) {
  const outcome = OUTCOME_LABEL[signal.outcome];
  return (
    <li className={styles.signal}>
      <span className={styles.signalLabel}>{signal.label}</span>
      <span className={cx(styles.outcome, styles[signal.outcome])}>
        <span className={styles.glyph} aria-hidden="true">
          {outcome.glyph}
        </span>
        {outcome.text}
        {signal.confidence !== null && (
          <span className={styles.confidence}>
            indice {String(Math.round(signal.confidence * 100))} % · indicatif
          </span>
        )}
      </span>
      <span className={styles.signalDetail}>{signal.detail}</span>
    </li>
  );
}

function VerificationContent({ itemId }: VerificationPageProps) {
  const { account } = useSession();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const state = useAsync(
    `verification-${itemId}`,
    () => api.items.get(itemId),
    running ? POLL_MS : null,
  );
  const item = state.data;
  const isRunning = item?.verification.status === 'running';
  if (isRunning !== running && item !== null) {
    setRunning(isRunning);
  }

  if (state.status === 'error' && item === null) {
    if (isApiError(state.error) && state.error.status === 404) {
      return (
        <HallLayout width="narrow">
          <HallIntro
            eyebrow="Vérification"
            lines={['Fiche', 'introuvable.']}
            compact
            lede="Cette fiche n’existe pas ou ne vous est pas accessible."
          />
          <ButtonLink to={paths.space} variant="secondary">
            Retour à mon espace
          </ButtonLink>
        </HallLayout>
      );
    }
    return (
      <HallLayout width="narrow">
        <StatusBanner
          tone="error"
          requestId={errorRequestId(state.error)}
          action={{ label: 'Réessayer', onClick: state.reload }}
        >
          {errorMessage(state.error)}
        </StatusBanner>
      </HallLayout>
    );
  }
  if (item === null) {
    return (
      <HallLayout>
        <p className="visually-hidden" role="status">
          Chargement de la vérification…
        </p>
      </HallLayout>
    );
  }

  const owner = account !== null && item.ownerId === account.accountId;
  const reviewer = hasPermission(account, 'reviewer');
  const verification = item.verification;

  const start = async (): Promise<void> => {
    setStarting(true);
    setStartError(null);
    try {
      await api.verification.start(item.id);
      state.reload();
    } catch (reason: unknown) {
      setStartError(reason);
    } finally {
      setStarting(false);
    }
  };

  const history = [...item.history].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <HallLayout currentPath={paths.verification(item.id)}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow={`Vérification · ${item.depositNumber}`}
            lines={['Vérifier', 'avant', 'd’exposer.']}
            compact
            lede="L’analyse assistée relève des indices ; la relecture humaine décide ; la publication et le certificat suivent. Rien ici n’est une preuve d’authenticité."
          >
            <p className={styles.itemTitle}>{item.title}</p>
            <Tracker steps={trackerSteps(item)} />
          </HallIntro>
        }
      >
        <HallSection number="01" title="Analyse assistée">
          <DemoBadge />
          {verification.status === 'not_started' ||
          verification.status === 'failed' ? (
            <>
              <ol className={styles.checks}>
                {CHECKS.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ol>
              {verification.status === 'failed' && (
                <StatusBanner tone="error">
                  La dernière analyse n’a pas abouti. Vous pouvez la relancer.
                </StatusBanner>
              )}
              {(owner || reviewer) && (
                <div className={styles.row}>
                  <Button
                    variant="primary"
                    withArrow
                    loading={starting}
                    onClick={() => {
                      void start();
                    }}
                  >
                    Lancer l’analyse
                  </Button>
                </div>
              )}
            </>
          ) : verification.status === 'running' ? (
            <div className={styles.running} role="status" aria-live="polite">
              Analyse en cours…
              <span className={styles.bar} aria-hidden="true" />
              <span>
                Métadonnées, génération par IA, cohérence, provenance et
                doublons sont examinés. Quelques secondes.
              </span>
            </div>
          ) : (
            <>
              <ul className={styles.signals} aria-label="Signaux de l’analyse">
                {verification.signals.map((signal) => (
                  <SignalRow key={signal.id} signal={signal} />
                ))}
              </ul>
              <p className={styles.reviewMeta}>
                Terminée le {formatDateTime(verification.completedAt)}.
              </p>
              {(owner || reviewer) && (
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.ghost}
                    disabled={starting}
                    onClick={() => {
                      void start();
                    }}
                  >
                    Relancer l’analyse
                  </button>
                </div>
              )}
            </>
          )}
          {startError !== null && (
            <StatusBanner tone="error" requestId={errorRequestId(startError)}>
              {errorMessage(startError)}
            </StatusBanner>
          )}
          <StatusBanner tone="info">
            Ces signaux orientent la relecture humaine. Aucun score n’établit
            l’authenticité d’une œuvre ni ne modifie son statut.
          </StatusBanner>
        </HallSection>

        <HallSection number="02" title="Relecture humaine">
          <div className={styles.review}>
            <div className={styles.row}>
              <StateLabel
                review={item.review.state}
                publication={item.publication}
              />
              <ClaimLabel status={item.review.itemClaims} scope="Œuvre" />
              <ClaimLabel
                status={item.review.descriptionClaims}
                scope="Description"
              />
            </div>
            {item.review.reviewerName !== null && (
              <p className={styles.reviewMeta}>
                {item.review.reviewerName}
                {item.review.updatedAt !== null &&
                  ` · ${formatDateTime(item.review.updatedAt)}`}
              </p>
            )}
            {item.review.rationale !== null && (
              <blockquote className={styles.quote}>
                {item.review.rationale}
              </blockquote>
            )}
            {item.review.requestedChanges !== null && (
              <StatusBanner tone="warning">
                Corrections demandées : {item.review.requestedChanges}
              </StatusBanner>
            )}
            {item.review.state === 'not_submitted' && (
              <p className={styles.reviewMeta}>
                La relecture commence une fois la fiche envoyée depuis le
                parcours de dépôt.
              </p>
            )}
            <div className={styles.actions}>
              {reviewer &&
                !owner &&
                (item.review.state === 'pending' ||
                  item.review.state === 'changes_requested') && (
                  <ButtonLink
                    to={paths.adminItem(item.id)}
                    variant="primary"
                    withArrow
                  >
                    Ouvrir la relecture
                  </ButtonLink>
                )}
              {owner && item.review.state === 'not_submitted' && (
                <ButtonLink to={paths.wizard(item.id, 1)} variant="secondary">
                  Reprendre le dépôt
                </ButtonLink>
              )}
              {owner && (
                <Link to={paths.submission(item.id)} className={styles.ghost}>
                  Suivi du dépôt
                </Link>
              )}
            </div>
          </div>
        </HallSection>

        <HallSection number="03" title="Historique">
          <ol className={styles.history}>
            {history.map((event) => (
              <li key={event.id} className={styles.event}>
                <span className={styles.when}>
                  <span className={styles.actor}>
                    {ACTOR_LABEL[event.actor]}
                  </span>
                  {formatDateTime(event.at)}
                </span>
                <span className={styles.eventLabel}>
                  {event.label}
                  {event.detail !== null && (
                    <span className={styles.eventDetail}>{event.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </HallSection>

        <HallSection number="04" title="Certificat de provenance">
          <ProvenancePanel
            item={item}
            as="h3"
            onChange={(provenance) => {
              state.setData({ ...item, provenance });
            }}
          />
        </HallSection>
      </HallSplit>
    </HallLayout>
  );
}

/** Verification and certification of one item, for its owner and the reviewers. */
export function VerificationPage({ itemId }: VerificationPageProps) {
  return (
    <RequireSession>
      <VerificationContent itemId={itemId} />
    </RequireSession>
  );
}
