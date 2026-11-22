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
import type { TrackerStep } from '../../components/tracker/Tracker';
import { Tracker } from '../../components/tracker/Tracker';
import {
  api,
  errorMessage,
  errorRequestId,
  isApiError,
  useAsync,
} from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { Link } from '../../lib/router/Link';
import { useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import { formatDate, formatDateTime, MEDIUM_LABEL } from './contribute-content';
import styles from './SubmissionPage.module.css';

export interface SubmissionPageProps {
  itemId: string;
}

interface Presentation {
  eyebrow: string;
  lines: readonly string[];
  lede: string;
  steps: readonly TrackerStep[];
}

function submittedAt(item: Item): string | null {
  const event = [...item.history]
    .reverse()
    .find((candidate) => candidate.label.startsWith('Envoyée en relecture'));
  return event?.at ?? null;
}

function present(item: Item): Presentation {
  const received = submittedAt(item) ?? item.createdAt;
  const reviewedAt = item.review.updatedAt;
  switch (item.review.state) {
    case 'pending':
      return {
        eyebrow: 'Contribution envoyée',
        lines: ['Misaotra !', 'Votre œuvre est', 'entre nos mains.'],
        lede: 'L’équipe de KANTO va la relire sous 7 jours. Nous vous écrirons à l’adresse de votre compte dès qu’elle sera accrochée — ou si une précision est nécessaire.',
        steps: [
          { title: 'Reçue', detail: formatDate(received), state: 'done' },
          {
            title: 'En relecture',
            detail: 'Sous 7 jours · équipe de conservation',
            state: 'active',
          },
          {
            title: 'Accrochée dans la salle',
            detail: 'Vous serez prévenu·e par e-mail',
            state: 'upcoming',
          },
        ],
      };
    case 'changes_requested':
      return {
        eyebrow: 'Corrections demandées',
        lines: ['Une précision', 'est', 'nécessaire.'],
        lede: 'L’équipe de conservation a relu votre fiche et vous demande un complément avant de l’accrocher. Corrigez-la, elle repartira en relecture.',
        steps: [
          { title: 'Reçue', detail: formatDate(received), state: 'done' },
          {
            title: 'Corrections demandées',
            detail: reviewedAt === null ? undefined : formatDate(reviewedAt),
            state: 'active',
          },
          { title: 'Accrochée dans la salle', state: 'upcoming' },
        ],
      };
    case 'rejected':
      return {
        eyebrow: 'Relecture terminée',
        lines: ['Cette œuvre', 'ne sera pas', 'accrochée.'],
        lede: 'Après relecture humaine, l’équipe de conservation n’a pas retenu cette contribution. La raison est détaillée ci-contre.',
        steps: [
          { title: 'Reçue', detail: formatDate(received), state: 'done' },
          {
            title: 'Relue',
            detail: reviewedAt === null ? undefined : formatDate(reviewedAt),
            state: 'done',
          },
          {
            title: 'Refusée',
            detail: item.review.rationale ?? undefined,
            state: 'failed',
          },
        ],
      };
    case 'approved':
      return {
        eyebrow:
          item.publication === 'published'
            ? 'Œuvre accrochée'
            : 'Œuvre retirée',
        lines:
          item.publication === 'published'
            ? ['Votre œuvre', 'est dans', 'le musée.']
            : ['Votre œuvre', 'a été', 'retirée.'],
        lede:
          item.publication === 'published'
            ? 'Elle est visible par les visiteurs avec sa notice, son récit et ses mentions de relecture.'
            : 'Elle n’apparaît plus dans le musée. Son dossier reste consultable ici.',
        steps: [
          { title: 'Reçue', detail: formatDate(received), state: 'done' },
          {
            title: 'Relue',
            detail: reviewedAt === null ? undefined : formatDate(reviewedAt),
            state: 'done',
          },
          item.publication === 'published'
            ? { title: 'Accrochée dans la salle', state: 'done' }
            : { title: 'Retirée du musée', state: 'failed' },
        ],
      };
    default:
      return {
        eyebrow: 'Brouillon',
        lines: ['Votre fiche', 'vous', 'attend.'],
        lede: 'Reprenez là où vous vous êtes arrêté·e : chaque étape est enregistrée automatiquement.',
        steps: [
          {
            title: 'Brouillon',
            detail: `Modifié le ${formatDate(item.updatedAt)}`,
            state: 'active',
          },
          { title: 'En relecture', state: 'upcoming' },
          { title: 'Accrochée dans la salle', state: 'upcoming' },
        ],
      };
  }
}

function Actions({ item }: { item: Item }) {
  switch (item.review.state) {
    case 'pending':
      return (
        <>
          <ButtonLink to={paths.museum()} variant="primary">
            Visiter le musée
          </ButtonLink>
          <ButtonLink to={paths.wizardNew} variant="secondary">
            Déposer une autre œuvre
          </ButtonLink>
        </>
      );
    case 'changes_requested':
      return (
        <>
          <ButtonLink to={paths.wizard(item.id, 1)} variant="primary" withArrow>
            Corriger
          </ButtonLink>
          <ButtonLink to={paths.museum()} variant="secondary">
            Visiter le musée
          </ButtonLink>
        </>
      );
    case 'rejected':
      return (
        <ButtonLink to={paths.wizardNew} variant="secondary">
          Déposer une autre œuvre
        </ButtonLink>
      );
    case 'approved':
      return (
        <>
          <ButtonLink to={paths.item(item.id)} variant="primary" withArrow>
            Voir dans le musée
          </ButtonLink>
          <ButtonLink to={paths.wizardNew} variant="secondary">
            Déposer une autre œuvre
          </ButtonLink>
        </>
      );
    default:
      return (
        <ButtonLink to={paths.wizard(item.id, 1)} variant="primary" withArrow>
          Reprendre
        </ButtonLink>
      );
  }
}

function SubmissionScreen({ itemId }: SubmissionPageProps) {
  const { account } = useSession();
  const state = useAsync(`submission:${itemId}`, () => api.items.get(itemId));

  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.status === 404;
    return (
      <HallLayout width="narrow" currentPath={paths.contribute}>
        <HallIntro
          eyebrow="Mes dépôts"
          lines={
            notFound
              ? ['Ce dépôt', 'est introuvable.']
              : ['Le dépôt', 'n’a pas pu', 'être ouvert.']
          }
          lede={
            notFound
              ? 'Le lien est peut-être incomplet, ou la fiche a été retirée.'
              : undefined
          }
          compact
        />
        {notFound ? (
          <ButtonLink to={paths.space} variant="secondary">
            Retour à mon espace
          </ButtonLink>
        ) : (
          <StatusBanner
            tone="error"
            requestId={errorRequestId(state.error)}
            action={{ label: 'Réessayer', onClick: state.reload }}
          >
            {errorMessage(state.error)}
          </StatusBanner>
        )}
      </HallLayout>
    );
  }

  const item = state.data;
  if (item === null) {
    return (
      <HallLayout currentPath={paths.contribute}>
        <p className="visually-hidden" role="status">
          Chargement du dépôt…
        </p>
      </HallLayout>
    );
  }

  const presentation = present(item);
  const history = [...item.history].reverse();
  // The hanging ceremony is the owner's: it can be seen again once the work is in the museum.
  const canReplayHanging =
    item.publication === 'published' && account?.accountId === item.ownerId;

  return (
    <HallLayout currentPath={paths.contribute}>
      <HallSplit
        aside={
          <HallIntro
            eyebrow={presentation.eyebrow}
            lines={presentation.lines}
            accentLast={false}
            lede={presentation.lede}
          >
            <div className={styles.buttons}>
              <Actions item={item} />
            </div>
            {canReplayHanging && (
              <p className={styles.verification}>
                <Link to={paths.hanging(item.id)}>Revoir l’accrochage</Link>
              </p>
            )}
          </HallIntro>
        }
      >
        <section aria-label="Bordereau de dépôt" className={styles.slip}>
          <p className={styles.slipEyebrow}>
            Bordereau de dépôt · N° {item.depositNumber}
          </p>
          <h2 className={styles.slipTitle}>
            {item.title === '' ? 'Sans titre' : item.title}
          </h2>
          <p className={styles.slipMeta}>
            {MEDIUM_LABEL[item.medium]}
            {item.author !== '' && ` · ${item.author}`}
            {' · '}
            {item.review.state === 'not_submitted'
              ? 'créée'
              : 'déposée'} le {formatDate(submittedAt(item) ?? item.createdAt)}
          </p>
        </section>
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
          {item.isDemo && <DemoBadge always label="Contenu de démonstration" />}
        </div>
        <Tracker steps={presentation.steps} />
        {item.review.state === 'changes_requested' &&
          item.review.requestedChanges !== null && (
            <p className={styles.note}>
              <span className={styles.noteLabel}>Ce que l’équipe demande</span>
              {item.review.requestedChanges}
            </p>
          )}
        {item.review.state === 'rejected' && item.review.rationale !== null && (
          <p className={styles.note}>
            <span className={styles.noteLabel}>Motif de la relecture</span>
            {item.review.rationale}
          </p>
        )}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Vérification assistée</h3>
          <p className={styles.verification}>
            Métadonnées, indices de génération par IA, cohérence et provenance :{' '}
            <Link to={paths.verification(item.id)}>
              voir l’analyse de cette fiche
            </Link>
            . Ces signaux orientent la relecture humaine et ne valent jamais
            preuve.
          </p>
        </section>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Historique</h3>
          <ol className={styles.history}>
            {history.map((event) => (
              <li key={event.id} className={styles.event}>
                <span className={styles.eventDate}>
                  {formatDateTime(event.at)}
                </span>
                <span>
                  {event.label}
                  {event.detail !== null && (
                    <span className={styles.eventDetail}>{event.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
        {state.status === 'loading' && (
          <p className="visually-hidden" role="status">
            Actualisation…
          </p>
        )}
        <Button
          variant="ghost"
          onClick={state.reload}
          aria-label="Actualiser le dépôt"
        >
          Actualiser
        </Button>
      </HallSplit>
    </HallLayout>
  );
}

/** `/contribuer/:id`: the confirmation of Figma B5 and the follow-up of a submission. */
export function SubmissionPage({ itemId }: SubmissionPageProps) {
  return (
    <RequireSession>
      <SubmissionScreen itemId={itemId} />
    </RequireSession>
  );
}
