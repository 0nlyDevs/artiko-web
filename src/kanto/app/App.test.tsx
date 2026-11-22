import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../lib/api';
import { session } from '../lib/session/session';
import { settleMotion } from '../test/motion';
import { App } from './App';

const HOME_TITLE = 'L’art malagasy, à portée de regard.';

describe('App routing', () => {
  it('renders the home page at /', async () => {
    render(<App />);
    await settleMotion();

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: HOME_TITLE }),
    ).toBeTruthy();
  });

  it('renders the gallery room from a deep link', async () => {
    window.history.replaceState(null, '', '/musee/peinture/02');
    render(<App />);
    await settleMotion();

    // The wall tells the story of the work the address names.
    expect(
      screen.getByRole('heading', { level: 1, name: /Antongona/ }),
    ).toBeTruthy();
    expect(screen.getByText('Salle 01 · Peinture — Efitrano 01')).toBeTruthy();
    expect(screen.getByText('Œuvre 02 / 04')).toBeTruthy();
  });

  it('redirects /musee to the first artwork of the first room', () => {
    window.history.replaceState(null, '', '/musee');
    render(<App />);

    expect(window.location.pathname).toBe('/musee/peinture/01');
  });

  it('renders a not-found page for unknown paths', () => {
    window.history.replaceState(null, '', '/nulle-part');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Page introuvable',
    );
  });
});

describe('App routing of the hanging ceremony', () => {
  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('opens the ceremony of a sent work for its owner', async () => {
    resetDemoData();
    session.reset();
    await session.signIn({
      email: 'visiteur@kanto.demo',
      password: 'kanto-demo-2026',
    });
    window.history.replaceState(
      null,
      '',
      '/contribuer/sub-hautes-terres/accrochage',
    );
    render(<App />);

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /Misaotra !\s+Votre œuvre est\s+déposée\./ },
        { timeout: 4000 },
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('sends a guest to sign in, then back to the ceremony', async () => {
    resetDemoData();
    session.reset();
    window.history.replaceState(
      null,
      '',
      '/contribuer/sub-hautes-terres/accrochage',
    );
    render(<App />);

    await waitFor(
      () => {
        expect(window.location.pathname).toBe('/connexion');
      },
      { timeout: 4000 },
    );
    expect(new URLSearchParams(window.location.search).get('suite')).toBe(
      '/contribuer/sub-hautes-terres/accrochage',
    );
  });
});
