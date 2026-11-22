import { useId } from 'react';
import type { Key } from '@/i18n/en';
import { setLocale, useT } from '@/i18n/locale';
import { dictionaries, LOCALE_NAMES, LOCALES } from '@/i18n/locales';
import { categoryLabel } from '@/lib/works/category-label';
import { paths } from '../../app/routes';
import { cx } from '../../lib/cx';
import { UNREAD_PLAN } from '../../lib/museum-data/plan';
import { useMuseumPlan } from '../../lib/museum-data/store';
import { Link } from '../../lib/router/Link';
import { playMuseumExit } from '../visit/museum-exit';
import { chromeStyles } from './GalleryChrome';
import styles from './MuseumPlan.module.css';
import type { PlanRoomView } from './plan/plan-view';
import { currentCategory, planHrefs, planRoomViews } from './plan/plan-view';

export interface MuseumPlanProps {
  activeRoomSlug: string;
  titleId: string;
  onClose: () => void;
}

type Translate = ReturnType<typeof useT>['t'];

function RoomCard({
  room,
  onClose,
}: {
  room: PlanRoomView;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const textKey = `plan.text.${room.id}`;
  const content = (
    <>
      <span className={styles.number}>
        {t('plan.room', { n: room.number })}
      </span>
      <span className={styles.name}>
        {categoryLabel(room.category, locale)}
      </span>
      {/* A short description replaces the counters of the mockup: the API gives no total. */}
      {textKey in dictionaries[locale] && (
        <span className={styles.text}>{t(textKey as Key)}</span>
      )}
      <span className={styles.status}>{roomStatus(room, t)}</span>
    </>
  );

  if (room.destination === null) {
    return (
      <div className={styles.card} data-room={room.id} data-state={room.state}>
        {content}
      </div>
    );
  }
  if (room.destination.kind === 'room') {
    return (
      <Link
        to={room.destination.to}
        className={styles.card}
        data-room={room.id}
        data-state={room.state}
        aria-current={room.current ? 'page' : undefined}
        onClick={onClose}
      >
        {content}
      </Link>
    );
  }
  return (
    <a
      href={room.destination.href}
      className={styles.card}
      data-room={room.id}
      data-state={room.state}
    >
      {content}
    </a>
  );
}

function roomStatus(room: PlanRoomView, t: Translate) {
  if (room.current) {
    return <span className={styles.here}>{t('plan.here')}</span>;
  }
  // Decided by the probe of the category, never by the drawing.
  if (room.state === 'empty') {
    return (
      <span className={styles.hanging}>
        {t('plan.hanging')}
        {room.destination !== null && <Arrow />}
      </span>
    );
  }
  return (
    <>
      {t('plan.enter')}
      <Arrow />
    </>
  );
}

function Arrow() {
  return (
    <span className={styles.arrow} aria-hidden="true">
      →
    </span>
  );
}

/**
 * Figma R8 "Plan du musée": one room per art form of the API, open or still
 * being hung according to what the server read, the artists' rooms, and the
 * ways out to the hall, the Panthéon and the publication.
 */
export function MuseumPlan({
  activeRoomSlug,
  titleId,
  onClose,
}: MuseumPlanProps) {
  const { t, locale } = useT();
  const artistsId = useId();
  const answer = useMuseumPlan();
  // Until the server answer arrives the plan shows the art forms of the contract, without a state.
  const plan = answer ?? UNREAD_PLAN;
  const rooms = planRoomViews(plan, activeRoomSlug);

  return (
    // The museum around the plan is written in French; the plan follows the visitor's language.
    <nav className={styles.plan} aria-labelledby={titleId} lang={locale}>
      <div className={styles.bar}>
        <button
          type="button"
          className={chromeStyles.glassButton}
          onClick={onClose}
          aria-keyshortcuts="Escape"
        >
          {t('plan.close')}
        </button>
      </div>
      <div className={styles.column}>
        <h2 id={titleId} className={styles.title}>
          {t('plan.title')}
        </h2>

        <ul
          className={styles.rooms}
          aria-label={t('plan.rooms')}
          aria-busy={answer === null}
        >
          {rooms.map((room) => (
            <li key={room.id} className={styles.room}>
              <RoomCard room={room} onClose={onClose} />
            </li>
          ))}
        </ul>
        <p className={styles.entrance}>
          <span aria-hidden="true">↑ </span>
          {t('plan.entrance')}
        </p>
        {answer !== null && !answer.complete && (
          <p className={styles.notice} role="status">
            {t('plan.unread')}
          </p>
        )}

        <section className={styles.artistsBlock} aria-labelledby={artistsId}>
          <h3 id={artistsId} className={styles.eyebrow}>
            {t('plan.artists')}
          </h3>
          <ul className={styles.artists}>
            {plan.artists.map((artist) => (
              <li key={artist.id}>
                <a
                  href={planHrefs.artistRoom(artist.id)}
                  className={styles.chip}
                >
                  {artist.region === ''
                    ? artist.name
                    : `${artist.name} · ${artist.region}`}
                </a>
              </li>
            ))}
            <li>
              <a
                href={planHrefs.allArtists}
                className={cx(styles.chip, styles.chipAll)}
              >
                {t('plan.allArtists')}
                <Arrow />
              </a>
            </li>
          </ul>
        </section>

        <div className={styles.actions}>
          <Link to={paths.home} className={styles.pill} onClick={onClose}>
            {t('plan.hall')}
          </Link>
          <a
            href={planHrefs.pantheon(currentCategory(rooms))}
            className={styles.pill}
          >
            {t('plan.pantheon')}
          </a>
          <a
            href={planHrefs.publish}
            className={cx(styles.pill, styles.paperPill)}
          >
            {t('plan.publish')}
          </a>
          <Link
            to={paths.end}
            className={styles.pill}
            onClick={onClose}
            beforeNavigate={playMuseumExit}
          >
            {t('plan.endVisit')}
          </Link>
        </div>

        {/* The rooms have no navigation bar: the account, the heritage index, the scanner and the language are reached from here. */}
        <div
          className={styles.elsewhere}
          role="group"
          aria-label={t('plan.elsewhere')}
        >
          <a href={planHrefs.account} className={styles.quiet}>
            {t('nav.mySpace')}
          </a>
          <a href={planHrefs.heritage} className={styles.quiet}>
            {t('nav.livingHeritage')}
          </a>
          <a href={planHrefs.scan} className={styles.quiet}>
            {t('nav.scanner')}
          </a>
          <div
            className={styles.languages}
            role="group"
            aria-label={t('lang.label')}
          >
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={styles.language}
                lang={code}
                aria-pressed={code === locale}
                aria-label={LOCALE_NAMES[code]}
                title={LOCALE_NAMES[code]}
                onClick={() => {
                  setLocale(code);
                }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
