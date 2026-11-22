import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { DEMO_PASSWORD } from '../../lib/api/mock/fixtures';
import { session } from '../../lib/session/session';
import { LoginPage } from './LoginPage';

function fillAndSubmit(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
    window.history.replaceState(null, '', '/connexion');
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('signs the demo contributor in and opens my space', async () => {
    render(<LoginPage />);
    fillAndSubmit('visiteur@kanto.demo', DEMO_PASSWORD);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/mon-espace');
    });
    expect(session.getState().account?.displayName).toBe('Rasoa Haingo');
  });

  it('follows the suite query after sign-in', async () => {
    window.history.replaceState(null, '', '/connexion?suite=%2Fcontribuer');
    render(<LoginPage />);
    fillAndSubmit('visiteur@kanto.demo', DEMO_PASSWORD);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/contribuer');
    });
  });

  it('shows one generic message for a wrong password', async () => {
    render(<LoginPage />);
    fillAndSubmit('visiteur@kanto.demo', 'mauvais-mot-de-passe');

    expect(
      await screen.findByText('Adresse ou mot de passe incorrect.'),
    ).toBeTruthy();
    expect(window.location.pathname).toBe('/connexion');
    expect(session.getState().status).not.toBe('signed-in');
  });

  it('tells a freshly registered visitor to sign in', () => {
    window.history.replaceState(null, '', '/connexion?inscrit=1');
    render(<LoginPage />);

    expect(
      screen.getByText('Compte créé. Connectez-vous pour continuer.'),
    ).toBeTruthy();
  });
});
