import { useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import {
  HallIntro,
  HallLayout,
  HallSection,
  HallSplit,
} from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { isMockApi, resetDemoData } from '../../lib/api';
import type { Permission } from '../../lib/api/types';
import { useAmbience } from '../../lib/audio/ambience';
import { useReducedMotion } from '../../lib/motion/reduced-motion';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { hasPermission, session, useSession } from '../../lib/session/session';
import { RequireSession } from '../account/RequireSession';
import styles from './SpacePage.module.css';

const PERMISSION_LABEL: Record<Permission, string> = {
  reviewer: 'Relecture',
  admin: 'Administration',
};

function ProfileContent() {
  const { account } = useSession();
  const reducedMotion = useReducedMotion();
  const sound = useAmbience();
  const [signingOut, setSigningOut] = useState(false);
  const permissions: string[] = ['Contributeur'];
  for (const permission of ['reviewer', 'admin'] as const) {
    if (account !== null && account.permissions.includes(permission)) {
      permissions.push(PERMISSION_LABEL[permission]);
    }
  }
  const soundText = !sound.enabled
    ? 'coupé'
    : sound.status === 'unavailable'
      ? 'indisponible sur cet appareil'
      : sound.track === null
        ? 'activé'
        : `activé · ${sound.track.label}`;

  async function signOut(): Promise<void> {
    setSigningOut(true);
    try {
      await session.signOut();
      navigate(paths.home);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <HallLayout currentPath={paths.profile}>
      <HallSplit
        aside={
          <>
            <p className={styles.back}>
              <Link to={paths.space}>← Mon espace</Link>
            </p>
            <HallIntro
              eyebrow="Compte"
              lines={['Mon', 'profil.']}
              lede="Votre identité sur KANTO, vos permissions et les règles de votre session."
              compact
            />
          </>
        }
      >
        <HallSection number="01" title="Identité">
          <dl className={styles.details}>
            <dt>Nom</dt>
            <dd>{account?.displayName ?? ''}</dd>
            <dt>Adresse e-mail</dt>
            <dd>{account?.email ?? ''}</dd>
            <dt>Permissions</dt>
            <dd>
              <span className={styles.chips}>
                {permissions.map((label) => (
                  <span key={label} className={styles.chip}>
                    {label}
                  </span>
                ))}
              </span>
            </dd>
          </dl>
          <StatusBanner tone="info">
            La modification du nom et de l’adresse n’est pas encore dans le
            contrat des comptes ([PROPOSED] PATCH /auth/me). Elle arrivera avec
            le service Auth.
          </StatusBanner>
        </HallSection>

        <HallSection number="02" title="Préférences de visite">
          <dl className={styles.details}>
            <dt>Mouvement réduit</dt>
            <dd>
              {reducedMotion ? 'Activé' : 'Désactivé'} — réglage de votre
              système, suivi par chaque animation du musée.
            </dd>
            <dt>Son d’ambiance</dt>
            <dd>
              Actuellement {soundText}. Le son ne démarre jamais seul : un clic
              ou la touche M l’active dans les salles.
            </dd>
          </dl>
        </HallSection>

        <HallSection number="03" title="Session">
          <ul className={styles.rules}>
            <li>Une session se ferme après 2 h sans activité.</li>
            <li>Elle expire au plus tard 7 jours après la connexion.</li>
            <li>Se déconnecter la révoque immédiatement sur cet appareil.</li>
          </ul>
          <div className={styles.footer}>
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
            {hasPermission(account, 'reviewer') && (
              <Link className={styles.action} to={paths.admin}>
                Ouvrir la relecture
              </Link>
            )}
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
          </div>
        </HallSection>
      </HallSplit>
    </HallLayout>
  );
}

/** `/mon-espace/profil`: identity, permissions, visit preferences and session rules. */
export function ProfilePage() {
  return (
    <RequireSession>
      <ProfileContent />
    </RequireSession>
  );
}
