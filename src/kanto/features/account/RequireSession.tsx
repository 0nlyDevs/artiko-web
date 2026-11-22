import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import type { Permission } from '../../lib/api/types';
import { navigate, useLocationPath } from '../../lib/router/router';
import { hasPermission, session, useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';

export interface RequireSessionProps {
  children: ReactNode;
  /** Required permission on top of being signed in. */
  permission?: Permission | undefined;
}

/**
 * Guards a hall page. A guest goes to sign-in and comes back here afterwards
 * (UX-01 step 4). Nothing is rendered until the session is known.
 */
export function RequireSession({ children, permission }: RequireSessionProps) {
  const { status, account } = useSession();
  const pathname = useLocationPath();

  useEffect(() => {
    void session.load();
  }, []);

  // One redirect per mount: the guard may stay mounted while the address changes to /connexion.
  const redirected = useRef(false);
  useEffect(() => {
    if (
      status === 'guest' &&
      !redirected.current &&
      !pathname.startsWith('/connexion')
    ) {
      redirected.current = true;
      navigate(paths.login(`${pathname}${window.location.search}`), {
        replace: true,
      });
    }
  }, [status, pathname]);

  if (status !== 'signed-in') {
    return (
      <HallLayout>
        <p className="visually-hidden" role="status">
          Vérification de la session…
        </p>
      </HallLayout>
    );
  }
  if (permission !== undefined && !hasPermission(account, permission)) {
    return (
      <HallLayout width="narrow">
        <HallIntro
          eyebrow="Accès réservé"
          lines={['Cet espace', 'demande', 'une permission.']}
          lede="Seules les personnes qui ont la permission de relecture ouvrent cette page. Demandez-la à l’équipe de conservation."
          compact
        />
        <ButtonLink to={paths.space} variant="secondary">
          Retour à mon espace
        </ButtonLink>
      </HallLayout>
    );
  }
  return children;
}
