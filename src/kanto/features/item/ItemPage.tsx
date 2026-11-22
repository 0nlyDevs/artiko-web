import { useState } from 'react';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import {
  ClaimLabel,
  StateLabel,
} from '../../components/claim-label/ClaimLabel';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { ItemImage } from '../../components/item-meta/ItemImage';
import {
  MEDIUM_LABEL,
  primaryImage,
  readyImages,
  relationshipLabel,
  roomLabel,
  roomPathOf,
} from '../../components/item-meta/item-meta';
import { ProvenancePanel } from '../../components/provenance-panel/ProvenancePanel';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import {
  api,
  errorMessage,
  errorRequestId,
  isApiError,
  useAsync,
} from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { hasPermission, useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';
import { ArtworkViewer } from '../artwork-viewer';
import styles from './ItemPage.module.css';

export interface ItemPageProps {
  itemId: string;
}

function NotFound() {
  return (
    <HallLayout width="narrow">
      <div className={styles.notFound}>
        <HallIntro
          eyebrow="Œuvre"
          lines={['Œuvre', 'introuvable.']}
          accentLast
          compact
          lede="Cette fiche n’existe pas, n’est pas encore publiée ou a été retirée du musée."
        />
        <ButtonLink to={paths.items} variant="secondary">
          Voir les œuvres exposées
        </ButtonLink>
      </div>
    </HallLayout>
  );
}

function Loading() {
  return (
    <HallLayout>
      <div
        className={styles.detail}
        aria-busy="true"
        aria-label="Chargement de l’œuvre"
      >
        <div className={styles.skeleton} />
        <div>
          <div className={cx(styles.skeletonLine, styles.short)} />
          <div className={cx(styles.skeletonLine, styles.long)} />
          <div className={cx(styles.skeletonLine, styles.medium)} />
        </div>
      </div>
    </HallLayout>
  );
}

interface MediaColumnProps {
  item: Item;
}

function MediaColumn({ item }: MediaColumnProps) {
  const images = readyImages(item);
  const primary = primaryImage(item);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'photo' | '3d'>('photo');
  const active = images.find((media) => media.id === activeId) ?? primary;
  const model = item.model3d;
  const alt = `${item.title}, ${item.author}`;
  const show3d =
    view === '3d' && model.status === 'ready' && model.variants !== null;

  return (
    <div className={styles.media}>
      {show3d && model.variants !== null ? (
        <div className={cx(styles.stage, styles.stage3d)}>
          <div className={styles.viewerFrame}>
            <ArtworkViewer
              poster={primary?.url ?? model.variants.poster}
              model1k={model.variants.glb1k}
              {...(model.variants.glb2k === null
                ? {}
                : { model2k: model.variants.glb2k })}
              alt={alt}
              bottomScanned={false}
            />
          </div>
        </div>
      ) : (
        <figure className={styles.stage}>
          <ItemImage src={active?.url ?? null} alt={alt} priority />
        </figure>
      )}

      {model.status === 'ready' && (
        <div
          className={styles.modes}
          role="group"
          aria-label="Mode de visualisation"
        >
          <button
            type="button"
            className={styles.mode}
            aria-pressed={view === 'photo'}
            onClick={() => {
              setView('photo');
            }}
          >
            Photographies
          </button>
          <button
            type="button"
            className={styles.mode}
            aria-pressed={view === '3d'}
            onClick={() => {
              setView('3d');
            }}
          >
            Voir en 3D
          </button>
        </div>
      )}
      {model.status === 'processing' && (
        <p className={styles.note} role="status">
          Modèle 3D en préparation : la vue interactive arrivera une fois le
          fichier optimisé.
        </p>
      )}

      {!show3d && images.length > 1 && (
        <ul className={styles.thumbs} aria-label="Autres vues">
          {images.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                className={styles.thumb}
                aria-pressed={media.id === active?.id}
                aria-label={`Voir ${media.name}`}
                onClick={() => {
                  setActiveId(media.id);
                }}
              >
                <ItemImage src={media.url} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Public detail of a work (UX-01 step 2): media, author, description, the two review labels, 3D and provenance. */
export function ItemPage({ itemId }: ItemPageProps) {
  const { account } = useSession();
  const state = useAsync(`item-${itemId}`, () => api.items.get(itemId));
  const item = state.data;

  if (state.status === 'error' && item === null) {
    if (isApiError(state.error) && state.error.status === 404) {
      return <NotFound />;
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
    return <Loading />;
  }

  const owner = account !== null && item.ownerId === account.accountId;
  const reviewer = hasPermission(account, 'reviewer');
  const details: readonly [string, string][] = [
    ['Technique', item.details.technique],
    ['Dimensions', item.details.dimensions],
    ['Région', item.details.region],
    ['Période', item.details.period],
    [
      'Provenance',
      [relationshipLabel(item.rights.relationship), item.rights.holder]
        .filter((part) => part.trim() !== '')
        .join(' · '),
    ],
  ];

  return (
    <HallLayout>
      {(owner || reviewer) && (
        <div className={styles.ownerBar}>
          <StateLabel
            review={item.review.state}
            publication={item.publication}
          />
          <span>Bordereau {item.depositNumber}</span>
          <span className={styles.ownerLinks}>
            <Link to={paths.verification(item.id)} className={styles.ownerLink}>
              Vérification
            </Link>
            {owner && (
              <Link to={paths.submission(item.id)} className={styles.ownerLink}>
                Suivi du dépôt
              </Link>
            )}
            {reviewer && !owner && (
              <Link to={paths.adminItem(item.id)} className={styles.ownerLink}>
                Relecture
              </Link>
            )}
          </span>
        </div>
      )}
      <article className={styles.detail} aria-labelledby="item-title">
        <MediaColumn item={item} />

        <div className={styles.text}>
          <p className={styles.eyebrow}>
            <span>
              {MEDIUM_LABEL[item.medium]} · {item.depositNumber}
              {item.room !== null && ` · ${roomLabel(item.room)}`}
            </span>
            <DemoBadge />
          </p>
          {item.isDemo && (
            <span className={styles.demo}>
              Œuvre de démonstration · contenu fictif
            </span>
          )}
          <h1 id="item-title" className={styles.title}>
            {item.title}
          </h1>
          <p className={styles.author}>
            {item.author}
            {item.details.place !== '' && ` · ${item.details.place}`}
          </p>

          <dl className={styles.details}>
            {details
              .filter(([, value]) => value.trim() !== '')
              .map(([label, value]) => (
                <div key={label} className={styles.pair}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>

          {(item.details.summary !== '' || item.details.story !== '') && (
            <section className={styles.section} aria-labelledby="item-story">
              <h2 id="item-story" className={styles.sectionTitle}>
                Le récit
              </h2>
              {item.details.summary !== '' && (
                <p className={styles.story}>{item.details.summary}</p>
              )}
              {item.details.story !== '' && (
                <p className={styles.story}>{item.details.story}</p>
              )}
            </section>
          )}

          <section className={styles.section} aria-labelledby="item-review">
            <h2 id="item-review" className={styles.sectionTitle}>
              Relecture
            </h2>
            <div className={styles.labels}>
              <ClaimLabel status={item.review.itemClaims} scope="Œuvre" />
              <ClaimLabel
                status={item.review.descriptionClaims}
                scope="Description"
              />
            </div>
            <p className={styles.hint}>
              Ces deux mentions sont indépendantes de la publication : une
              information non relue ou incertaine reste affichée comme telle, et
              aucune analyse automatique ne la rend « vérifiée ».
            </p>
            {item.review.rationale !== null &&
              item.publication === 'published' && (
                <p className={styles.hint}>
                  Relecture
                  {item.review.reviewerName !== null &&
                    ` par ${item.review.reviewerName}`}{' '}
                  : {item.review.rationale}
                </p>
              )}
          </section>

          <div className={styles.actions}>
            {item.room !== null && (
              <ButtonLink
                to={roomPathOf(item.room)}
                variant="primary"
                withArrow
              >
                Dans le musée
              </ButtonLink>
            )}
            <ButtonLink to={paths.items} variant="secondary">
              Toutes les œuvres
            </ButtonLink>
          </div>

          <ProvenancePanel
            item={item}
            onChange={(provenance) => {
              state.setData({ ...item, provenance });
            }}
          />
        </div>
      </article>
    </HallLayout>
  );
}
