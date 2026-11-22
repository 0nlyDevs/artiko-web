import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { hasPermission, useSession } from '../../lib/session/session';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { Logo } from '../logo/Logo';
import { NavLink } from '../nav-link/NavLink';
import { SoundToggle } from '../sound-toggle/SoundToggle';
import styles from './HallLayout.module.css';

/** Room links of the home nav, reused by every hall page. */
const ROOM_LINKS = [
  { to: '/musee/peinture/01', label: 'Peintures' },
  { to: '/musee/sculpture/01', label: 'Sculptures' },
  { to: '/musee/savoir-faire', label: 'Artisanat' },
  { to: '/musee/musique', label: 'Musique' },
] as const;

export interface HallLayoutProps {
  children: ReactNode;
  /** `narrow` centres a 640 px column, for sign-in and confirmations. */
  width?: 'wide' | 'narrow' | undefined;
  currentPath?: string | undefined;
}

/** The light "hall" frame shared by every functional page. */
export function HallLayout({
  children,
  width = 'wide',
  currentPath,
}: HallLayoutProps) {
  const { status, account } = useSession();
  const reviewer = hasPermission(account, 'reviewer');
  return (
    <div className={styles.hall}>
      <header className={styles.nav}>
        <Link to="/" className={styles.logo} aria-label="KANTO, accueil">
          <Logo />
        </Link>
        <div className={styles.navRight}>
          <nav aria-label="Salles du musée">
            <ul className={styles.links}>
              {ROOM_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to}>{link.label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <nav className={styles.session} aria-label="Compte">
            {status === 'signed-in' ? (
              <>
                {reviewer && (
                  <NavLink
                    to="/admin"
                    current={currentPath?.startsWith('/admin') ?? false}
                  >
                    Relecture
                  </NavLink>
                )}
                <NavLink
                  to="/mon-espace"
                  current={currentPath?.startsWith('/mon-espace') ?? false}
                >
                  Mon espace
                </NavLink>
              </>
            ) : (
              <NavLink to="/connexion" current={currentPath === '/connexion'}>
                Connexion
              </NavLink>
            )}
            <SoundToggle theme="light" compact />
          </nav>
        </div>
      </header>
      <main className={cx(styles.main, width === 'narrow' && styles.narrow)}>
        {children}
      </main>
    </div>
  );
}

export interface HallSplitProps {
  aside: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}

/** Two columns of the Contribuer frames: intro on the left, content on the right. */
export function HallSplit({ aside, children, className }: HallSplitProps) {
  return (
    <div className={cx(styles.split, className)}>
      <aside className={styles.aside}>{aside}</aside>
      <div>{children}</div>
    </div>
  );
}

export interface HallIntroProps {
  eyebrow?: string | undefined;
  /** Headline lines; the last one is set in wine when `accentLast` is true. */
  lines: readonly string[];
  accentLast?: boolean | undefined;
  lede?: ReactNode | undefined;
  compact?: boolean | undefined;
  children?: ReactNode | undefined;
  /** Heading level of the headline. */
  as?: 'h1' | 'h2' | undefined;
  id?: string | undefined;
}

export function HallIntro({
  eyebrow,
  lines,
  accentLast = true,
  lede,
  compact = false,
  children,
  as: Heading = 'h1',
  id,
}: HallIntroProps) {
  return (
    <div className={cx(compact && styles.compact)}>
      {eyebrow !== undefined && <p className={styles.eyebrow}>{eyebrow}</p>}
      <Heading id={id} className={styles.headline}>
        {lines.map((line, index) => {
          const last = index === lines.length - 1;
          return (
            <Fragment key={line}>
              {index > 0 && <br />}
              {accentLast && last ? (
                <span className={styles.accent}>{line}</span>
              ) : (
                line
              )}
            </Fragment>
          );
        })}
      </Heading>
      {lede !== undefined && <p className={styles.lede}>{lede}</p>}
      {children}
    </div>
  );
}

export interface HallSectionProps {
  number?: string | undefined;
  title: string;
  children: ReactNode;
  className?: string | undefined;
}

/** "01 — QUELLE FORME D'ART ?" block. */
export function HallSection({
  number,
  title,
  children,
  className,
}: HallSectionProps) {
  return (
    <section className={cx(styles.section, className)}>
      <h2 className={styles.sectionLabel}>
        {number !== undefined && `${number} — `}
        {title}
      </h2>
      {children}
    </section>
  );
}

export interface HallActionsProps {
  note?: string | undefined;
  children: ReactNode;
}

/** Bottom row: a quiet status on the left, actions on the right. */
export function HallActions({ note, children }: HallActionsProps) {
  return (
    <div className={styles.actions}>
      {note !== undefined && <span className={styles.actionsNote}>{note}</span>}
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.fieldRow}>{children}</div>;
}
