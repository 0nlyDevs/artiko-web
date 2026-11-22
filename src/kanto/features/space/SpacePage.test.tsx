import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { DEMO_PASSWORD } from '../../lib/api/mock/fixtures';
import { useLocationPath } from '../../lib/router/router';
import { session } from '../../lib/session/session';
import { SpacePage } from './SpacePage';

/** Renders the page only at its address, as the app's router does. */
function Harness() {
  const pathname = useLocationPath();
  return pathname === '/mon-espace' ? <SpacePage /> : <p>Ailleurs</p>;
}

describe('SpacePage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('sends a guest to sign-in and keeps the way back', async () => {
    window.history.replaceState(null, '', '/mon-espace');
    render(<Harness />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/connexion');
    });
    expect(new URLSearchParams(window.location.search).get('suite')).toBe(
      '/mon-espace',
    );
  });

  it('lists the demo contributor’s deposits with their states', async () => {
    await session.signIn({
      email: 'visiteur@kanto.demo',
      password: DEMO_PASSWORD,
    });
    window.history.replaceState(null, '', '/mon-espace');
    render(<SpacePage />);

    expect(await screen.findByText('Hautes Terres, fin du jour')).toBeTruthy();
    expect(screen.getByText('Paysage de baobabs au crépuscule')).toBeTruthy();
    expect(screen.getByText('Sinibe d’Ambatolampy')).toBeTruthy();
    expect(screen.getByText('En relecture')).toBeTruthy();
    expect(screen.getByText('Refusée')).toBeTruthy();
    expect(screen.getByText('Brouillon')).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: /Rasoa Haingo/ }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Reprendre' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Suivre' })).toBeTruthy();
  });
});
