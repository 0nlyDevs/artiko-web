import type { ComponentType } from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { GalleryBlack } from '../features/hanging/GalleryFade';
import { HomePage } from '../features/home/HomePage';
import { ambience } from '../lib/audio/ambience';
import { Link } from '../lib/router/Link';
import { navigate, useLocationPath } from '../lib/router/router';
import { session } from '../lib/session/session';
import { MuseumRoute } from './MuseumRoute';
import { matchRoute, paths } from './routes';
import styles from './App.module.css';

/*
 * The home and the museum load with the app. Every hall page (account,
 * contribution, verification, scan, administration) loads on demand, so the
 * visit keeps its bundle.
 */
function lazyPage<P extends object>(
  load: () => Promise<Record<string, unknown>>,
  name: string,
) {
  return lazy(async () => {
    const loaded = await load();
    return { default: loaded[name] as ComponentType<P> };
  });
}

const MotionLab = lazyPage(() => import('./MotionLab'), 'MotionLab');
const LoginPage = lazyPage(
  () => import('../features/account/LoginPage'),
  'LoginPage',
);
const RegisterPage = lazyPage(
  () => import('../features/account/RegisterPage'),
  'RegisterPage',
);
const ContributeHubPage = lazyPage(
  () => import('../features/contribute/ContributeHubPage'),
  'ContributeHubPage',
);
const WizardPage = lazyPage<{ itemId: string | null; step: 1 | 2 | 3 | 4 }>(
  () => import('../features/contribute/WizardPage'),
  'WizardPage',
);
const SubmissionPage = lazyPage<{ itemId: string }>(
  () => import('../features/contribute/SubmissionPage'),
  'SubmissionPage',
);
const HangingPage = lazyPage<{ itemId: string }>(
  () => import('../features/hanging/HangingPage'),
  'HangingPage',
);
const ItemsPage = lazyPage(
  () => import('../features/item/ItemsPage'),
  'ItemsPage',
);
const ItemPage = lazyPage<{ itemId: string }>(
  () => import('../features/item/ItemPage'),
  'ItemPage',
);
const SpacePage = lazyPage(
  () => import('../features/space/SpacePage'),
  'SpacePage',
);
const ProfilePage = lazyPage(
  () => import('../features/space/ProfilePage'),
  'ProfilePage',
);
const VerificationPage = lazyPage<{ itemId: string }>(
  () => import('../features/verification/VerificationPage'),
  'VerificationPage',
);
const ScanDesktopPage = lazyPage<{ sessionId: string | null }>(
  () => import('../features/scan/ScanDesktopPage'),
  'ScanDesktopPage',
);
const ScanPhonePage = lazyPage<{ sessionId: string }>(
  () => import('../features/scan/ScanPhonePage'),
  'ScanPhonePage',
);
const AdminListPage = lazyPage(
  () => import('../features/admin/AdminListPage'),
  'AdminListPage',
);
const AdminReviewPage = lazyPage<{ itemId: string }>(
  () => import('../features/admin/AdminReviewPage'),
  'AdminReviewPage',
);
const EndOfVisitPage = lazyPage(
  () => import('../features/visit/EndOfVisitPage'),
  'EndOfVisitPage',
);

function showMotionLab(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    new URLSearchParams(window.location.search).get('motion') === 'lab'
  );
}

function NotFound() {
  return (
    <main className={styles.notFound}>
      <h1>Page introuvable</h1>
      <p>
        <Link to={paths.home}>Retour à l’accueil</Link>
      </p>
    </main>
  );
}

/** Ivory frame shown while a hall page loads, so nothing flashes. */
function HallFallback() {
  return <div className={styles.hallFallback} aria-hidden="true" />;
}

function Screen({ pathname }: { pathname: string }) {
  const route = matchRoute(pathname);

  useEffect(() => {
    if (route.kind === 'redirect') {
      navigate(route.to, { replace: true });
    }
  }, [route]);

  switch (route.kind) {
    case 'home':
      return <HomePage />;
    case 'gallery':
      return (
        <MuseumRoute room={route.room} artworkIndex={route.artworkIndex} />
      );
    case 'end':
      return <EndOfVisitPage />;
    case 'items':
      return <ItemsPage />;
    case 'item':
      return <ItemPage itemId={route.itemId} />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'contribute':
      return <ContributeHubPage />;
    case 'wizard':
      return <WizardPage itemId={route.itemId} step={route.step} />;
    case 'submission':
      return <SubmissionPage itemId={route.itemId} />;
    case 'hanging':
      // The ceremony opens on gallery black: its own fallback keeps the
      // ivory frame of the hall pages from flashing while it loads.
      return (
        <Suspense fallback={<GalleryBlack />}>
          <HangingPage itemId={route.itemId} />
        </Suspense>
      );
    case 'space':
      return <SpacePage />;
    case 'profile':
      return <ProfilePage />;
    case 'verification':
      return <VerificationPage itemId={route.itemId} />;
    case 'scan-new':
      return <ScanDesktopPage sessionId={null} />;
    case 'scan':
      return <ScanDesktopPage sessionId={route.sessionId} />;
    case 'scan-phone':
      return <ScanPhonePage sessionId={route.sessionId} />;
    case 'admin':
      return <AdminListPage />;
    case 'admin-item':
      return <AdminReviewPage itemId={route.itemId} />;
    case 'redirect':
      return null;
    case 'not-found':
      return <NotFound />;
  }
}

export function App() {
  const pathname = useLocationPath();

  useEffect(() => {
    void session.load();
    return () => {
      ambience.reset();
    };
  }, []);

  return (
    <>
      <Suspense fallback={<HallFallback />}>
        <Screen pathname={pathname} />
      </Suspense>
      {showMotionLab() && (
        <Suspense fallback={null}>
          <MotionLab />
        </Suspense>
      )}
    </>
  );
}
