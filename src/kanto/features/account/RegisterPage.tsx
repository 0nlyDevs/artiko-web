import type { SyntheticEvent } from 'react';
import { useMemo, useState } from 'react';
import { paths } from '../../app/routes';
import { Button } from '../../components/button/Button';
import { HallIntro, HallLayout } from '../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../components/status-banner/StatusBanner';
import { TextField } from '../../components/text-field/TextField';
import { isApiError } from '../../lib/api';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { session } from '../../lib/session/session';
import styles from './AccountPage.module.css';
import type { ShownError } from './account-utils';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  describeAuthError,
  fieldErrors,
  passwordLength,
  readSuite,
} from './account-utils';

type Field = 'displayName' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (values.displayName.trim() === '') {
    errors.displayName = 'Indiquez le nom qui signera vos dépôts.';
  }
  if (!EMAIL.test(values.email.trim())) {
    errors.email = 'Donnez une adresse e-mail valide.';
  }
  const length = passwordLength(values.password);
  if (length < PASSWORD_MIN || length > PASSWORD_MAX) {
    errors.password = `Le mot de passe compte entre ${String(PASSWORD_MIN)} et ${String(PASSWORD_MAX)} caractères.`;
  }
  if (values.confirm !== values.password) {
    errors.confirm = 'Les deux mots de passe ne correspondent pas.';
  }
  return errors;
}

/** `/inscription`: creates the account, then sends to sign-in (registration opens no session). */
export function RegisterPage() {
  const search = window.location.search;
  const suite = useMemo(() => readSuite(search), [search]);
  const [values, setValues] = useState<Record<Field, string>>({
    displayName: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ShownError | null>(null);

  const set = (field: Field) => (value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    if (field === 'email') {
      setEmailTaken(false);
    }
  };

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    try {
      await session.register({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      const target = paths.login(suite ?? undefined);
      navigate(`${target}${target.includes('?') ? '&' : '?'}inscrit=1`, {
        replace: true,
      });
    } catch (caught: unknown) {
      if (isApiError(caught) && caught.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrors({ email: 'Un compte existe déjà avec cette adresse.' });
        setEmailTaken(true);
      } else if (isApiError(caught) && caught.code === 'VALIDATION_FAILED') {
        const details = fieldErrors(caught);
        const next: Errors = {};
        for (const field of ['displayName', 'email', 'password'] as const) {
          const reason = details[field];
          if (reason !== undefined) {
            next[field] = reason;
          }
        }
        setErrors(next);
        if (Object.keys(details).length === 0) {
          setError(describeAuthError(caught));
        }
      } else {
        setError(describeAuthError(caught));
      }
      setBusy(false);
    }
  }

  return (
    <HallLayout width="narrow" currentPath={paths.register}>
      <HallIntro
        eyebrow="Compte"
        lines={['Créez', 'votre', 'espace.']}
        lede="Un compte sert à déposer des œuvres, suivre leur relecture et demander leur certificat. La visite du musée reste libre."
        compact
      />
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
          label="Votre nom"
          name="displayName"
          autoComplete="name"
          required
          value={values.displayName}
          onChange={set('displayName')}
          error={errors.displayName}
          hint="Tel qu’il apparaîtra sur vos fiches."
        />
        <TextField
          label="Adresse e-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={set('email')}
          error={errors.email}
        />
        {emailTaken && (
          <p className={styles.fieldNote}>
            <Link
              className={styles.inlineLink}
              to={paths.login(suite ?? undefined)}
            >
              Se connecter avec cette adresse
            </Link>
          </p>
        )}
        <TextField
          label="Mot de passe"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint="Entre 12 et 128 caractères."
        />
        <TextField
          label="Confirmez le mot de passe"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        <Button
          type="submit"
          className={styles.submit}
          loading={busy}
          withArrow
        >
          Créer mon compte
        </Button>
      </form>
      <p className={styles.alt}>
        Déjà un compte ?{' '}
        <Link to={paths.login(suite ?? undefined)}>Se connecter</Link>
      </p>
    </HallLayout>
  );
}
