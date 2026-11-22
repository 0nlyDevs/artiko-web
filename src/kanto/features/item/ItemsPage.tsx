import { useMemo, useState } from 'react';
import { ClaimLabel } from '../../components/claim-label/ClaimLabel';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { ItemImage } from '../../components/item-meta/ItemImage';
import {
  MEDIUM_OPTIONS,
  primaryImage,
  roomLabel,
} from '../../components/item-meta/item-meta';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { TextField } from '../../components/text-field/TextField';
import { api, errorMessage, errorRequestId, useAsync } from '../../lib/api';
import type { Item, Medium } from '../../lib/api/types';
import { Link } from '../../lib/router/Link';
import { paths } from '../../app/routes';
import styles from './ItemsPage.module.css';

const SKELETONS = [1, 2, 3, 4, 5, 6];

function matches(item: Item, query: string, medium: Medium | null): boolean {
  if (medium !== null && item.medium !== medium) {
    return false;
  }
  if (query === '') {
    return true;
  }
  const haystack =
    `${item.title} ${item.author} ${item.details.region} ${item.details.technique} ${item.details.summary}`.toLowerCase();
  return haystack.includes(query);
}

/** Discovery list of the published works: search, medium filter, cards into the item page. */
export function ItemsPage() {
  const [query, setQuery] = useState('');
  const [medium, setMedium] = useState<Medium | null>(null);
  const items = useAsync('items-published', () => api.items.list());

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items.data ?? []).filter((item) => matches(item, needle, medium));
  }, [items.data, query, medium]);

  return (
    <HallLayout currentPath={paths.items}>
      <div className={styles.header}>
        <div className={styles.intro}>
          <DemoBadge className={styles.badge} />
          <HallIntro
            eyebrow="Collection"
            lines={['Les œuvres', 'du musée']}
            accentLast
            compact
            lede="Peintures, sculptures, savoir-faire et musiques déposés par leurs auteurs ou détenteurs, relus avant d’être exposés. Chaque fiche montre ce qui est vérifié et ce qui ne l’est pas encore."
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <TextField
          className={styles.search}
          type="search"
          label="Rechercher"
          placeholder="Titre, artiste, région, technique…"
          value={query}
          onChange={setQuery}
          autoComplete="off"
        />
        <ul className={styles.filters} aria-label="Filtrer par forme d’art">
          <li>
            <button
              type="button"
              className={styles.filter}
              aria-pressed={medium === null}
              onClick={() => {
                setMedium(null);
              }}
            >
              Toutes
            </button>
          </li>
          {MEDIUM_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={styles.filter}
                aria-pressed={medium === option.value}
                onClick={() => {
                  setMedium(option.value);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {items.status === 'error' && items.data === null ? (
        <StatusBanner
          tone="error"
          requestId={errorRequestId(items.error)}
          action={{ label: 'Réessayer', onClick: items.reload }}
        >
          {errorMessage(items.error)}
        </StatusBanner>
      ) : items.data === null ? (
        <ul
          className={styles.grid}
          aria-busy="true"
          aria-label="Chargement des œuvres"
        >
          {SKELETONS.map((index) => (
            <li key={index} className={styles.skeleton} />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <p className={styles.empty} role="status">
          Aucune œuvre ne correspond.
        </p>
      ) : (
        <>
          <p className={styles.count} role="status">
            {visible.length === 1
              ? '1 œuvre'
              : `${String(visible.length)} œuvres`}
            {medium !== null || query.trim() !== ''
              ? ' correspondent'
              : ' exposées'}
          </p>
          <ul className={styles.grid}>
            {visible.map((item) => {
              const image = primaryImage(item);
              return (
                <li key={item.id}>
                  <Link to={paths.item(item.id)} className={styles.card}>
                    <figure className={styles.figure}>
                      <ItemImage
                        src={image?.url ?? null}
                        alt={`${item.title}, ${item.author}`}
                      />
                    </figure>
                    {item.room !== null && (
                      <span className={styles.room}>
                        {roomLabel(item.room)}
                      </span>
                    )}
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.meta}>
                      {item.author}
                      {item.details.region !== '' &&
                        ` · ${item.details.region}`}
                    </span>
                    <span className={styles.labels}>
                      <ClaimLabel
                        status={item.review.itemClaims}
                        scope="Œuvre"
                      />
                      <ClaimLabel
                        status={item.review.descriptionClaims}
                        scope="Description"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </HallLayout>
  );
}
