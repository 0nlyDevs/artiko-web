import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { RegisterPage } from './RegisterPage';

function fill(values: {
  name: string;
  email: string;
  password: string;
  confirm: string;
}): void {
  fireEvent.change(screen.getByLabelText('Votre nom'), {
    target: { value: values.name },
  });
  fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
    target: { value: values.email },
  });
  fireEvent.change(screen.getByLabelText('Mot de passe'), {
    target: { value: values.password },
  });
  fireEvent.change(screen.getByLabelText('Confirmez le mot de passe'), {
    target: { value: values.confirm },
  });
}

describe('RegisterPage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
    window.history.replaceState(null, '', '/inscription');
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('refuses a mismatched confirmation without calling the API', () => {
    const register = vi.spyOn(api.auth, 'register');
    render(<RegisterPage />);
    fill({
      name: 'Noro Rakoto',
      email: 'noro@example.org',
      password: 'un-mot-de-passe-long',
      confirm: 'un-autre-mot-de-passe',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(
      screen.getByText('Les deux mots de passe ne correspondent pas.'),
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('creates the account and sends to sign-in with the suite kept', async () => {
    window.history.replaceState(null, '', '/inscription?suite=%2Fcontribuer');
    render(<RegisterPage />);
    fill({
      name: 'Noro Rakoto',
      email: 'noro@example.org',
      password: 'un-mot-de-passe-long',
      confirm: 'un-mot-de-passe-long',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/connexion');
    });
    const search = new URLSearchParams(window.location.search);
    expect(search.get('inscrit')).toBe('1');
    expect(search.get('suite')).toBe('/contribuer');
    expect(session.getState().status).not.toBe('signed-in');
  });

  it('points an existing address to sign-in', async () => {
    render(<RegisterPage />);
    fill({
      name: 'Rasoa Haingo',
      email: 'visiteur@kanto.demo',
      password: 'un-mot-de-passe-long',
      confirm: 'un-mot-de-passe-long',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(
      await screen.findByText('Un compte existe déjà avec cette adresse.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Se connecter avec cette adresse' }),
    ).toBeTruthy();
  });
});
