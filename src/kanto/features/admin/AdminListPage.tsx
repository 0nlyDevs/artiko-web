import { useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import {
  ClaimLabel,
  StateLabel,
} from '../../components/claim-label/ClaimLabel';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { SelectField, TextField } from '../../components/text-field/TextField';
import { api, errorMessage, errorRequestId, useAsync } from '../../lib/api';
import type { Item, Medium } from '../../lib/api/types';
import { Link } from '../../lib/router/Link';
import { RequireSession } from '../account/RequireSession';
import styles from './Admin.module.css';
import { MEDIUM_TEXT, formatDate } from './admin-text';

type Tab = 'pending' | 'published' | 'all';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'pending', label: 'À relire' },
  { id: 'published', label: 'Publiées' },
  { id: 'all', label: 'Toutes' },
];

const MEDIUM_OPTIONS = (Object.keys(MEDIUM_TEXT) as Medium[]).map((value) => ({
  value,
  label: MEDIUM_TEXT[value],
}));

function isMedium(value: string): value is Medium {
  return value in MEDIUM_TEXT;
}

/** Review queue and published works, for accounts with the `reviewer` permission (P1, mocked). */
export function AdminListPage() {
  return (
    <RequireSession permission="reviewer">
      <AdminList />
    </RequireSession>
  );
}

function AdminList() {
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');
  const [medium, setMedium] = useState<Medium | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    text: string;
    requestId: string | null;
  } | null>(null);

  const list = useAsync(`admin:${tab}:${query}:${medium ?? ''}`, () =>
    api.items.list({
      status: tab === 'pending' ? 'pending_review' : tab,
      ...(medium === null ? {} : { medium }),
      ...(query.trim() === '' ? {} : { query }),
    }),
  );
  const items = list.data ?? [];

  const togglePublication = async (item: Item): Promise<void> => {
    setBusyId(item.id);
    setNotice(null);
    try {
      const next =
        item.publication === 'published' ? 'unpublished' : 'published';
      await api.items.setPublication(item.id, next);
      setNotice({
        tone: 'success',
        text:
          next === 'published'
            ? `« ${item.title} » est de nouveau dans le musée.`
            : `« ${item.title} » a été retirée du musée.`,
        requestId: null,
      });
      list.reload();
    } catch (error) {
      setNotice({
        tone: 'error',
        text: errorMessage(error),
        requestId: errorRequestId(error),
      });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <HallLayout currentPath={paths.admin}>
      <HallIntro
        eyebrow="Administration"
        lines={['Relecture', 'et publication.']}
        lede={
          <>
            Les dépôts à relire, les œuvres publiées et l’ensemble des fiches.
            Chaque décision est humaine ; les signaux d’analyse n’accordent
            jamais un statut. <DemoBadge />
          </>
        }
        compact
      />

      <div className={styles.toolbar}>
        <ul className={styles.tabs} aria-label="Filtres">
          {TABS.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                className={styles.tab}
                aria-pressed={tab === candidate.id}
                onClick={() => {
                  setTab(candidate.id);
                  setConfirmId(null);
                }}
              >
                {candidate.label}
                {tab === candidate.id &&
                  list.status === 'ready' &&
                  ` · ${String(items.length)}`}
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.filters}>
          <TextField
            label="Rechercher"
            placeholder="Titre, auteur, région…"
            value={query}
            onChange={setQuery}
          />
          <SelectField
            label="Forme d’art"
            placeholder="Toutes"
            options={MEDIUM_OPTIONS}
            value={medium ?? ''}
            onChange={(value) => {
              setMedium(isMedium(value) ? value : null);
            }}
          />
        </div>
      </div>

      {notice !== null && (
        <StatusBanner tone={notice.tone} requestId={notice.requestId}>
          {notice.text}
        </StatusBanner>
      )}

      {list.status === 'error' ? (
        <StatusBanner
          tone="error"
          requestId={errorRequestId(list.error)}
          action={{ label: 'Réessayer', onClick: list.reload }}
        >
          {errorMessage(list.error)}
        </StatusBanner>
      ) : list.status === 'loading' && list.data === null ? (
        <p className={styles.note} role="status">
          Chargement des fiches…
        </p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>
          {tab === 'pending'
            ? 'Rien à relire pour le moment.'
            : 'Aucune fiche ne correspond.'}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Bordereau</th>
                <th scope="col">Œuvre</th>
                <th scope="col">Forme</th>
                <th scope="col">État</th>
                <th scope="col">Relecture</th>
                <th scope="col">Mise à jour</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.deposit}>{item.depositNumber}</td>
                  <td>
                    <Link
                      to={paths.adminItem(item.id)}
                      className={styles.titleLink}
                    >
                      {item.title}
                    </Link>
                    <div className={styles.muted}>{item.author}</div>
                  </td>
                  <td>{MEDIUM_TEXT[item.medium]}</td>
                  <td>
                    <StateLabel
                      review={item.review.state}
                      publication={item.publication}
                    />
                  </td>
                  <td>
                    <div className={styles.labels}>
                      <ClaimLabel
                        status={item.review.itemClaims}
                        scope="Œuvre"
                      />
                      <ClaimLabel
                        status={item.review.descriptionClaims}
                        scope="Description"
                      />
                    </div>
                  </td>
                  <td className={styles.muted}>{formatDate(item.updatedAt)}</td>
                  <td>
                    {item.review.state === 'approved' &&
                      (confirmId === item.id ? (
                        <div className={styles.inline}>
                          <Button
                            size="small"
                            variant={
                              item.publication === 'published'
                                ? 'secondary'
                                : 'primary'
                            }
                            loading={busyId === item.id}
                            onClick={() => {
                              void togglePublication(item);
                            }}
                          >
                            Confirmer
                          </Button>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => {
                              setConfirmId(null);
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => {
                            setConfirmId(item.id);
                          }}
                        >
                          {item.publication === 'published'
                            ? 'Retirer du musée'
                            : 'Republier'}
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HallLayout>
  );
}
