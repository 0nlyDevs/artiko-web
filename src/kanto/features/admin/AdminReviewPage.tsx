import { useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { ChoiceTiles } from '../../components/choice-tile/ChoiceTile';
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
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { TextField } from '../../components/text-field/TextField';
import { Tracker } from '../../components/tracker/Tracker';
import type { TrackerStep } from '../../components/tracker/Tracker';
import {
  api,
  errorMessage,
  errorRequestId,
  isApiError,
  useAsync,
} from '../../lib/api';
import type {
  ClaimStatus,
  Item,
  ItemMedia,
  ReviewInput,
} from '../../lib/api/types';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { useSession } from '../../lib/session/session';
import { RequireSession } from '../account/RequireSession';
import styles from './Admin.module.css';
import {
  MEDIUM_TEXT,
  OUTCOME_TEXT,
  RELATIONSHIP_TEXT,
  formatDate,
} from './admin-text';

export interface AdminReviewPageProps {
  itemId: string;
}

const CLAIM_OPTIONS: readonly {
  value: ClaimStatus;
  title: string;
  description: string;
}[] = [
  {
    value: 'unreviewed',
    title: 'Non relu',
    description: 'Laisser la mention en attente.',
  },
  {
    value: 'verified',
    title: 'Vérifié',
    description: 'Des preuves suffisantes ont été trouvées.',
  },
  {
    value: 'uncertain',
    title: 'Incertain',
    description: 'Les preuves manquent ou se contredisent.',
  },
];

type Decision = ReviewInput['decision'];

/** Examine a submission and record the human decision (brief, section F). */
export function AdminReviewPage({ itemId }: AdminReviewPageProps) {
  return (
    <RequireSession permission="reviewer">
      <AdminReview itemId={itemId} />
    </RequireSession>
  );
}

function editorialSteps(item: Item): TrackerStep[] {
  const { state } = item.review;
  const received: TrackerStep = {
    title: 'Reçue',
    state: 'done',
    detail: formatDate(item.createdAt),
  };
  if (state === 'not_submitted') {
    return [
      { title: 'Brouillon', state: 'active' },
      { title: 'En relecture', state: 'upcoming' },
      { title: 'Accrochée dans la salle', state: 'upcoming' },
    ];
  }
  if (state === 'rejected') {
    return [
      received,
      {
        title: 'Relue',
        state: 'done',
        detail: formatDate(item.review.updatedAt),
      },
      {
        title: 'Refusée',
        state: 'failed',
        detail: item.review.rationale ?? undefined,
      },
    ];
  }
  if (state === 'changes_requested') {
    return [
      received,
      {
        title: 'Corrections demandées',
        state: 'active',
        detail: item.review.requestedChanges ?? undefined,
      },
      { title: 'Accrochée dans la salle', state: 'upcoming' },
    ];
  }
  if (state === 'approved') {
    return [
      received,
      {
        title: 'Relue',
        state: 'done',
        detail: formatDate(item.review.updatedAt),
      },
      item.publication === 'published'
        ? { title: 'Accrochée dans la salle', state: 'done' }
        : { title: 'Retirée du musée', state: 'failed' },
    ];
  }
  return [
    received,
    {
      title: 'En relecture',
      state: 'active',
      detail: 'Équipe de conservation',
    },
    { title: 'Accrochée dans la salle', state: 'upcoming' },
  ];
}

function Thumb({ media }: { media: ItemMedia }) {
  const [missing, setMissing] = useState(media.url === '');
  if (media.kind !== 'image') {
    return (
      <div>
        <div className={styles.thumbMissing}>
          {media.kind === 'model' ? 'Modèle 3D' : media.kind}
        </div>
        <p className={styles.caption}>{media.name}</p>
      </div>
    );
  }
  return (
    <div>
      {missing ? (
        <div
          className={styles.thumbMissing}
          role="img"
          aria-label={`${media.name}, image indisponible`}
        >
          Image indisponible
        </div>
      ) : (
        <img
          className={styles.thumb}
          src={media.url}
          alt={media.name}
          onError={() => {
            setMissing(true);
          }}
        />
      )}
      <p className={styles.caption}>
        {media.primary && 'Principale · '}
        {media.name}
      </p>
    </div>
  );
}

function AdminReview({ itemId }: AdminReviewPageProps) {
  const { account } = useSession();
  const live = useAsync(`admin-item:${itemId}`, () => api.items.get(itemId));
  const [itemClaims, setItemClaims] = useState<ClaimStatus>('unreviewed');
  const [descriptionClaims, setDescriptionClaims] =
    useState<ClaimStatus>('unreviewed');
  const [rationale, setRationale] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [mode, setMode] = useState<Decision | null>(null);
  const [submitting, setSubmitting] = useState<Decision | 'publication' | null>(
    null,
  );
  const [result, setResult] = useState<{
    tone: 'success' | 'error';
    text: string;
    requestId: string | null;
  } | null>(null);
  const [rationaleError, setRationaleError] = useState<string | undefined>(
    undefined,
  );

  if (live.status === 'error') {
    return (
      <HallLayout width="narrow">
        <HallIntro
          eyebrow="Relecture"
          lines={['Fiche', 'introuvable.']}
          compact
        />
        <StatusBanner tone="error" requestId={errorRequestId(live.error)}>
          {errorMessage(live.error)}
        </StatusBanner>
        <p>
          <ButtonLink to={paths.admin} variant="secondary">
            Retour à la relecture
          </ButtonLink>
        </p>
      </HallLayout>
    );
  }
  const item = live.data;
  if (item === null) {
    return (
      <HallLayout>
        <p className={styles.note} role="status">
          Chargement de la fiche…
        </p>
      </HallLayout>
    );
  }

  const own = account !== null && item.ownerId === account.accountId;
  const reviewable =
    !own &&
    (item.review.state === 'pending' ||
      item.review.state === 'changes_requested');

  const decide = async (decision: Decision): Promise<void> => {
    if (rationale.trim() === '') {
      setRationaleError(
        'Expliquez la décision en une phrase : elle est transmise au déposant.',
      );
      return;
    }
    setRationaleError(undefined);
    setSubmitting(decision);
    setResult(null);
    try {
      const updated = await api.items.review(item.id, {
        decision,
        itemClaims,
        descriptionClaims,
        rationale,
        requestedChanges,
      });
      live.setData(updated);
      setResult({
        tone: 'success',
        text:
          decision === 'approve'
            ? 'Décision enregistrée : l’œuvre est acceptée et publiée dans le musée.'
            : decision === 'request_changes'
              ? 'Décision enregistrée : des corrections sont demandées au déposant.'
              : 'Décision enregistrée : l’œuvre est refusée après relecture humaine.',
        requestId: null,
      });
      setMode(null);
    } catch (error) {
      const detail =
        isApiError(error) && error.details.length > 0
          ? ` ${error.details.map((entry) => entry.reason).join(' ')}`
          : '';
      setResult({
        tone: 'error',
        text: `${errorMessage(error)}${detail}`,
        requestId: errorRequestId(error),
      });
    } finally {
      setSubmitting(null);
    }
  };

  const togglePublication = async (): Promise<void> => {
    setSubmitting('publication');
    setResult(null);
    try {
      const next =
        item.publication === 'published' ? 'unpublished' : 'published';
      live.setData(await api.items.setPublication(item.id, next));
      setResult({
        tone: 'success',
        text:
          next === 'published'
            ? 'L’œuvre est de nouveau dans le musée.'
            : 'L’œuvre a été retirée du musée.',
        requestId: null,
      });
    } catch (error) {
      setResult({
        tone: 'error',
        text: errorMessage(error),
        requestId: errorRequestId(error),
      });
    } finally {
      setSubmitting(null);
    }
  };

  const signals = item.verification.signals;

  return (
    <HallLayout currentPath={paths.admin}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow={`Relecture · ${item.depositNumber}`}
            lines={['Examiner', 'la', 'contribution.']}
            lede={
              <>
                Déposée par {item.author} le {formatDate(item.createdAt)}.{' '}
                {item.isDemo && (
                  <DemoBadge always label="Contenu de démonstration" />
                )}
              </>
            }
            compact
          >
            <div className={styles.summary}>
              <div className={styles.labels}>
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
              <Tracker steps={editorialSteps(item)} />
              <p>
                <Link to={paths.admin}>← Retour à la liste</Link>
              </p>
            </div>
          </HallIntro>
        }
      >
        {result !== null && (
          <StatusBanner tone={result.tone} requestId={result.requestId}>
            {result.text}
            {result.tone === 'success' && (
              <span className={styles.sectionLinks}>
                {' '}
                <Link to={paths.admin}>Retour à la relecture</Link>
                <Link to={paths.item(item.id)}>Voir la fiche publique</Link>
              </span>
            )}
          </StatusBanner>
        )}

        <HallSection number="01" title="L’œuvre">
          <h2 className={styles.workTitle}>{item.title}</h2>
          <p className={styles.workMeta}>
            {item.author} · {MEDIUM_TEXT[item.medium]}
            {item.details.region !== '' && ` · ${item.details.region}`}
          </p>
          {item.media.length === 0 ? (
            <p className={styles.note}>Aucun média joint.</p>
          ) : (
            <div className={styles.gallery}>
              {item.media.map((media) => (
                <Thumb key={media.id} media={media} />
              ))}
            </div>
          )}
          <dl
            className={styles.details}
            style={{ marginTop: 'var(--space-24)' }}
          >
            <dt>Période</dt>
            <dd>{item.details.period || '—'}</dd>
            <dt>Lieu</dt>
            <dd>{item.details.place || '—'}</dd>
            <dt>Technique</dt>
            <dd>{item.details.technique || '—'}</dd>
            <dt>Dimensions</dt>
            <dd>{item.details.dimensions || '—'}</dd>
            <dt>Présentation</dt>
            <dd>{item.details.summary || '—'}</dd>
            <dt>Récit</dt>
            <dd>{item.details.story || '—'}</dd>
            <dt>Lien déclaré</dt>
            <dd>
              {item.rights.relationship === null
                ? '—'
                : RELATIONSHIP_TEXT[item.rights.relationship]}
            </dd>
            <dt>Droits</dt>
            <dd>
              {item.rights.holder || '—'} · partage{' '}
              {item.rights.consentShare ? '✓' : '✗'} · présentation{' '}
              {item.rights.consentDisplay ? '✓' : '✗'}
            </dd>
            <dt>Modèle 3D</dt>
            <dd>
              {item.model3d.status === 'ready'
                ? 'Prêt'
                : item.model3d.status === 'processing'
                  ? 'En préparation'
                  : 'Aucun'}
            </dd>
          </dl>
        </HallSection>

        <HallSection number="02" title="Signaux d’analyse">
          <p className={styles.note}>
            Les signaux orientent la relecture et ne décident jamais : un score
            n’est pas une preuve, et seule la relecture humaine attribue un
            statut.
          </p>
          {item.verification.status === 'done' && signals.length > 0 ? (
            <ul className={styles.signals}>
              {signals.map((candidate) => (
                <li key={candidate.id} className={styles.signal}>
                  <span className={cx(styles.chip, styles[candidate.outcome])}>
                    {OUTCOME_TEXT[candidate.outcome]}
                  </span>
                  <span className={styles.signalLabel}>
                    {candidate.label}
                    {candidate.confidence !== null &&
                      ` · indice ${String(Math.round(candidate.confidence * 100))} %`}
                  </span>
                  <span className={styles.signalDetail}>
                    {candidate.detail}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.sectionLinks}>
              <span className={styles.note}>
                {item.verification.status === 'running'
                  ? 'Analyse en cours.'
                  : 'Aucune analyse lancée pour cette fiche.'}
              </span>
              <ButtonLink to={paths.verification(item.id)} variant="secondary">
                Ouvrir la vérification
              </ButtonLink>
            </div>
          )}
        </HallSection>

        <HallSection number="03" title="Décision">
          {own && (
            <StatusBanner tone="warning">
              Vous avez déposé cette œuvre : une autre personne de l’équipe doit
              la relire.
            </StatusBanner>
          )}
          {!own && !reviewable && (
            <StatusBanner tone="info">
              {item.review.state === 'not_submitted'
                ? 'Ce brouillon n’a pas encore été envoyé en relecture.'
                : `Décision enregistrée par ${item.review.reviewerName ?? 'la relecture'} le ${formatDate(item.review.updatedAt)}${item.review.rationale === null ? '' : ` : ${item.review.rationale}`}`}
            </StatusBanner>
          )}
          <fieldset
            className={styles.decision}
            disabled={!reviewable || submitting !== null}
          >
            <legend className="visually-hidden">Décision de relecture</legend>
            <div className={styles.claimGroup}>
              <p className={styles.claimTitle}>
                Mentions sur l’œuvre (auteur, origine, technique)
              </p>
              <ChoiceTiles
                name="item-claims"
                label="Mentions sur l’œuvre"
                layout="row"
                options={CLAIM_OPTIONS}
                value={itemClaims}
                onChange={setItemClaims}
              />
            </div>
            <div className={styles.claimGroup}>
              <p className={styles.claimTitle}>Mentions de la description</p>
              <ChoiceTiles
                name="description-claims"
                label="Mentions de la description"
                layout="row"
                options={CLAIM_OPTIONS}
                value={descriptionClaims}
                onChange={setDescriptionClaims}
              />
            </div>
            <TextField
              multiline
              label="Justification (transmise au déposant)"
              value={rationale}
              onChange={(value) => {
                setRationale(value);
                if (value.trim() !== '') {
                  setRationaleError(undefined);
                }
              }}
              error={rationaleError}
              placeholder="Ce que la relecture a vérifié, ce qui manque, ce qui a été décidé."
              rows={3}
            />
            {mode === 'request_changes' && (
              <TextField
                multiline
                label="Corrections demandées"
                value={requestedChanges}
                onChange={setRequestedChanges}
                placeholder="Par exemple : ajouter une photographie de la pièce entière."
                rows={3}
              />
            )}
            <div className={styles.buttons}>
              <Button
                variant="primary"
                withArrow
                loading={submitting === 'approve'}
                onClick={() => {
                  setMode('approve');
                  void decide('approve');
                }}
              >
                Accepter et publier
              </Button>
              <Button
                variant="secondary"
                loading={submitting === 'request_changes'}
                onClick={() => {
                  if (mode !== 'request_changes') {
                    setMode('request_changes');
                    return;
                  }
                  void decide('request_changes');
                }}
              >
                {mode === 'request_changes'
                  ? 'Envoyer les corrections demandées'
                  : 'Demander des corrections'}
              </Button>
              <Button
                variant="ghost"
                loading={submitting === 'reject'}
                onClick={() => {
                  setMode('reject');
                  void decide('reject');
                }}
              >
                Refuser
              </Button>
            </div>
          </fieldset>
          {item.review.state === 'approved' && (
            <div
              className={styles.sectionLinks}
              style={{ marginTop: 'var(--space-20)' }}
            >
              <Button
                variant="secondary"
                size="small"
                loading={submitting === 'publication'}
                onClick={() => {
                  void togglePublication();
                }}
              >
                {item.publication === 'published'
                  ? 'Retirer du musée'
                  : 'Republier dans le musée'}
              </Button>
            </div>
          )}
        </HallSection>

        <HallSection number="04" title="Historique">
          <ul className={styles.history}>
            {[...item.history].reverse().map((event) => (
              <li key={event.id} className={styles.event}>
                <span className={styles.eventDate}>{formatDate(event.at)}</span>
                <span>
                  {event.label}
                  {event.detail !== null && (
                    <span className={styles.eventDetail}>{event.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </HallSection>
      </HallSplit>
    </HallLayout>
  );
}
