import { useEffect } from 'react';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { Logo } from '../../components/logo/Logo';
import { api, useAsync } from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import { isWebGLAvailable } from '../artwork-viewer/webgl';
import { GalleryBlack } from './GalleryFade';
import type { HangingCopy } from './hanging-content';
import {
  hangingAlt,
  hangingCartel,
  hangingCopy,
  hangingRoom,
  hangingSources,
  hangingStand,
} from './hanging-content';
import type { HangingStageSlots } from './HangingStage';
import { HangingStage } from './HangingStage';
import type { ExitTone } from './useHangingCeremony';

export interface HangingPageProps {
  itemId: string;
  /** Tests replace the WebGL check and the loading of model-viewer. */
  detectWebGL?: (() => boolean) | undefined;
  loadModelViewer?: (() => Promise<void>) | undefined;
}

/** The museum is dark, the hall pages are ivory: the screen fades to where it goes. */
function exitTone(to: string): ExitTone {
  return to.startsWith('/musee') ? 'museum' : 'hall';
}

interface CeremonyProps {
  item: Item;
  copy: HangingCopy;
  detectWebGL: () => boolean;
  loadModelViewer?: (() => Promise<void>) | undefined;
}

/** The ceremony of a museum item: its room, its cartel and the routes of the museum around the stage. */
function Ceremony({ item, copy, detectWebGL, loadModelViewer }: CeremonyProps) {
  const room = hangingRoom(item);
  const leaveTo =
    (slots: HangingStageSlots, to: string) => (): Promise<void> =>
      slots.leave(exitTone(to));

  return (
    <HangingStage
      status={copy.status}
      stand={hangingStand(item)}
      sources={hangingSources(item)}
      cartel={hangingCartel(item, copy.status)}
      alt={hangingAlt(item)}
      wall={{ tone: room.wallTone, photo: room.usesRedRoomScene }}
      copy={copy}
      labels={{ skip: 'Passer', skipAria: 'Passer l’animation' }}
      documentTitle={`KANTO — ${copy.eyebrow}`}
      detectWebGL={detectWebGL}
      loadModelViewer={loadModelViewer}
      brand={(slots) => (
        <Link
          to={paths.home}
          className={slots.classes.logo}
          aria-label="KANTO, retour à l’accueil"
          beforeNavigate={leaveTo(slots, paths.home)}
        >
          <Logo />
        </Link>
      )}
      badges={(slots) => (
        <>
          <DemoBadge theme="dark" className={slots.classes.badgeWide} />
          <DemoBadge
            theme="dark"
            label="Démonstration"
            className={slots.classes.badgeNarrow}
          />
        </>
      )}
      actions={(slots) => (
        <>
          <ButtonLink
            to={copy.primary.to}
            variant="primary"
            withArrow
            className={slots.classes.primary}
            beforeNavigate={leaveTo(slots, copy.primary.to)}
          >
            {copy.primary.label}
          </ButtonLink>
          <ButtonLink
            to={copy.secondary.to}
            variant="secondary"
            className={slots.classes.secondary}
            beforeNavigate={leaveTo(slots, copy.secondary.to)}
          >
            {copy.secondary.label}
          </ButtonLink>
          <p className={slots.classes.more}>
            <Link
              to={copy.tertiary.to}
              beforeNavigate={leaveTo(slots, copy.tertiary.to)}
            >
              {copy.tertiary.label}
            </Link>
          </p>
        </>
      )}
    />
  );
}

function HangingScreen({
  itemId,
  detectWebGL = isWebGLAvailable,
  loadModelViewer,
}: HangingPageProps) {
  const { account } = useSession();
  const state = useAsync(`hanging:${itemId}`, () => api.items.get(itemId));
  const item = state.data;
  const owner =
    item !== null && account !== null && item.ownerId === account.accountId;
  const copy = item !== null && owner ? hangingCopy(item) : null;

  // No ceremony: the submission page tells where the work stands, or why it
  // cannot be opened. A published work of someone else has its public notice.
  let away: string | null = null;
  if (state.status === 'error') {
    away = paths.submission(itemId);
  } else if (item !== null && copy === null) {
    away =
      !owner && item.publication === 'published'
        ? paths.item(item.id)
        : paths.submission(item.id);
  }
  useEffect(() => {
    if (away !== null) {
      navigate(away, { replace: true });
    }
  }, [away]);

  if (item === null || copy === null) {
    return <GalleryBlack label="Préparation de l’accrochage…" />;
  }
  return (
    <Ceremony
      key={item.id}
      item={item}
      copy={copy}
      detectWebGL={detectWebGL}
      loadModelViewer={loadModelViewer}
    />
  );
}

/**
 * `/contribuer/:id/accrochage`: the hanging ceremony shown to the owner of a
 * work once it is sent or published. Any other status has no ceremony and
 * goes to the submission page.
 */
export function HangingPage(props: HangingPageProps) {
  return (
    <RequireSession>
      <HangingScreen {...props} />
    </RequireSession>
  );
}
