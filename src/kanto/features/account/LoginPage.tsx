import type { SyntheticEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { TextField } from '../../components/text-field/TextField';
import { isMockApi } from '../../lib/api';
import { DEMO_PASSWORD } from '../../lib/api/mock/fixtures';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { session, useSession } from '../../lib/session/session';
import styles from './AccountPage.module.css';
import type { ShownError } from './account-utils';
import { describeAuthError, readSuite } from './account-utils';

/** Demo accounts of the in-browser mock (lib/api/mock/fixtures.ts). */
const DEMO_ACCOUNTS = [
  { email: 'visiteur@kanto.demo', role: 'Contributeur' },
  { email: 'relecture@kanto.demo', role: 'Relecture et administration' },
] as const;

/** `/connexion`: e-mail and password, one generic error (Auth contract CA5). */
export function LoginPage() {
  const { status } = useSession();
  const search = window.location.search;
  const suite = useMemo(() => readSuite(search) ?? paths.space, [search]);
  const registered = useMemo(
    () => new URLSearchParams(search).get('inscrit') === '1',
    [search],
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ShownError | null>(null);

  useEffect(() => {
    void session.load();
  }, []);

  useEffect(() => {
    if (status === 'signed-in') {
      navigate(suite, { replace: true });
    }
  }, [status, suite]);

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.signIn({ email, password });
      navigate(suite, { replace: true });
    } catch (caught: unknown) {
      setError(describeAuthError(caught));
      setBusy(false);
    }
  }

  return (
    <HallLayout width="narrow" currentPath={paths.login()}>
      <HallIntro
        eyebrow="Compte"
        lines={['Entrez', 'dans votre', 'espace.']}
        lede="Retrouvez vos dépôts, suivez leur relecture et reprenez un scan là où vous l’aviez laissé."
        compact
      />
      {registered && error === null && (
        <StatusBanner tone="success">
          Compte créé. Connectez-vous pour continuer.
        </StatusBanner>
      )}
      {error !== null && (
        <StatusBanner tone="error" requestId={error.requestId}>
          {error.message}
        </StatusBanner>
      )}
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <TextField
          label="Adresse e-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <TextField
          label="Mot de passe"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={setPassword}
        />
        <Button
          type="submit"
          className={styles.submit}
          loading={busy}
          disabled={email.trim() === '' || password === ''}
          withArrow
        >
          Se connecter
        </Button>
      </form>
      <p className={styles.alt}>
        Nouveau sur KANTO ? <Link to={paths.register}>Créer un compte</Link>
      </p>
      {isMockApi && (
        <section className={styles.demo} aria-labelledby="demo-accounts">
          <DemoBadge />
          <h2 id="demo-accounts" className={styles.demoTitle}>
            Comptes de démonstration
          </h2>
          <p className={styles.demoText}>
            Ces comptes n’existent que dans ce navigateur. Mot de passe commun :{' '}
            <code>{DEMO_PASSWORD}</code>.
          </p>
          <div className={styles.demoList}>
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="small"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                  setError(null);
                }}
              >
                {account.role} · {account.email}
              </Button>
            ))}
          </div>
        </section>
      )}
    </HallLayout>
  );
}
