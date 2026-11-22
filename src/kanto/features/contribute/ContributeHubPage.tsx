import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import {
  HallIntro,
  HallLayout,
  HallSection,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import { StateLabel } from '../../components/claim-label/ClaimLabel';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { api, errorMessage, errorRequestId, useAsync } from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { Link } from '../../lib/router/Link';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import { formatDate, MEDIUM_LABEL } from './contribute-content';
import styles from './ContributeHubPage.module.css';

const ENTRIES = [
  {
    number: '01',
    title: 'Créer une fiche',
    text: 'Donnez un titre, ajoutez une photo ou un modèle 3D, puis envoyez. Trois étapes, un brouillon enregistré à chaque instant.',
    cta: 'Commencer',
    to: paths.wizardNew,
  },
  {
    number: '02',
    title: 'Importer un modèle 3D',
    text: 'Vous avez déjà un fichier GLB, glTF ou USDZ ? Déposez-le, prévisualisez-le et complétez la fiche autour.',
    cta: 'Importer',
    to: `${paths.wizardNew}?mode=3d`,
  },
  {
    number: '03',
    title: 'Démarrer un scan avec mon iPhone',
    text: 'Lancez une session depuis cet ordinateur, poursuivez la capture LiDAR dans l’application sur votre iPhone, puis retrouvez le modèle ici.',
    cta: 'Lancer une session',
    to: paths.scanNew,
  },
] as const;

/** Where a submission in progress continues. */
function continuePath(item: Item): string {
  return item.review.state === 'not_submitted'
    ? paths.wizard(item.id, 1)
    : paths.submission(item.id);
}

function Drafts() {
  const state = useAsync('contribute-hub:mine', () =>
    api.items.list({ owner: 'me' }),
  );
  const inProgress = (state.data ?? []).filter(
    (item) =>
      item.review.state === 'not_submitted' ||
      item.review.state === 'pending' ||
      item.review.state === 'changes_requested',
  );

  if (state.status === 'error') {
    return (
      <StatusBanner
        tone="error"
        requestId={errorRequestId(state.error)}
        action={{ label: 'Réessayer', onClick: state.reload }}
      >
        {errorMessage(state.error)}
      </StatusBanner>
    );
  }
  if (state.status === 'loading' && state.data === null) {
    return (
      <p className={styles.empty} role="status">
        Chargement de vos dépôts…
      </p>
    );
  }
  return (
    <>
      {inProgress.length === 0 ? (
        <p className={styles.empty}>
          Aucun dépôt en cours. Votre première fiche prend quelques minutes.
        </p>
      ) : (
        <ul className={styles.list}>
          {inProgress.map((item) => (
            <li key={item.id} className={styles.row}>
              <span className={styles.rowTitle}>
                <span className={styles.rowName}>
                  {item.title === '' ? 'Sans titre' : item.title}
                </span>
                <span className={styles.rowMeta}>
                  {MEDIUM_LABEL[item.medium]} · {item.depositNumber} · modifiée
                  le {formatDate(item.updatedAt)}
                </span>
              </span>
              <StateLabel
                review={item.review.state}
                publication={item.publication}
              />
              <Link to={continuePath(item)} className={styles.rowLink}>
                {item.review.state === 'not_submitted' ? 'Reprendre' : 'Suivre'}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.more}>
        <Link to={paths.space}>Voir toutes mes œuvres dans mon espace</Link>
      </p>
    </>
  );
}

/** `/contribuer`: choose how to bring a work in, then resume what is in progress. */
export function ContributeHubPage() {
  return (
    <RequireSession>
      <HallLayout currentPath={paths.contribute}>
        <HallSplit
          aside={
            <HallIntro
              eyebrow="Déposer une œuvre"
              lines={['Confiez', 'votre œuvre', 'au musée.']}
              lede="Artistes, artisans, détenteurs de savoir-faire : déposez votre œuvre et racontez son histoire. Chaque contribution est relue par l’équipe de KANTO avant d’être exposée."
            >
              <DemoBadge />
            </HallIntro>
          }
        >
          <HallSection number="01" title="Par où commencer ?">
            <div className={styles.cards}>
              {ENTRIES.map((entry) => (
                <Link key={entry.number} to={entry.to} className={styles.card}>
                  <span className={styles.cardNumber}>{entry.number}</span>
                  <span className={styles.cardTitle}>{entry.title}</span>
                  <span className={styles.cardText}>{entry.text}</span>
                  <span className={styles.cardCta}>{entry.cta} →</span>
                </Link>
              ))}
            </div>
          </HallSection>
          <HallSection number="02" title="Mes dépôts en cours">
            <Drafts />
          </HallSection>
        </HallSplit>
      </HallLayout>
    </RequireSession>
  );
}
