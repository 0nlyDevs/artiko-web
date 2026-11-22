import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { ScanDesktopPage } from './ScanDesktopPage';

describe('ScanDesktopPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn({
      email: 'visiteur@kanto.demo',
      password: 'kanto-demo-2026',
    });
    window.history.replaceState(null, '', '/numerisation');
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('creates a session and shows its pairing code and QR code', async () => {
    render(<ScanDesktopPage sessionId={null} />);

    const code = await screen.findByText(
      /^[A-Z2-9]{6}$/,
      {},
      { timeout: 4000 },
    );
    expect(code).toBeTruthy();
    expect(window.location.pathname).toMatch(/^\/numerisation\/[^/]+$/);
    const qr = await screen.findByRole(
      'img',
      { name: /Code à scanner/ },
      { timeout: 4000 },
    );
    expect(qr.tagName.toLowerCase()).toBe('svg');
    expect(screen.getByText('En attente du téléphone…')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Créer la fiche à partir de ce scan',
      }),
    ).toBeDisabled();
  });
});
