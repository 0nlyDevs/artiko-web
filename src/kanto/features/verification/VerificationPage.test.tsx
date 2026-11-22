import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { VerificationPage } from './VerificationPage';

describe('VerificationPage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
    window.history.replaceState(null, '', '/verification/sub-hautes-terres');
  });
  afterEach(() => {
    session.reset();
  });

  it('runs the advisory analysis and lists its five signals', async () => {
    const user = userEvent.setup();
    await session.signIn({
      email: 'visiteur@kanto.demo',
      password: 'kanto-demo-2026',
    });
    render(<VerificationPage itemId="sub-hautes-terres" />);

    const start = await screen.findByRole(
      'button',
      { name: 'Lancer l’analyse' },
      { timeout: 6000 },
    );
    await user.click(start);

    await screen.findByText(
      'Détection de contenu généré par IA',
      {},
      { timeout: 8000 },
    );
    const list = screen.getByRole('list', { name: 'Signaux de l’analyse' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(
      screen.getByText(/Aucun score n’établit l’authenticité/),
    ).toBeTruthy();
    expect(screen.getByText('Dans la file de relecture')).toBeTruthy();
  }, 20000);

  it('sends a guest to sign in', () => {
    render(<VerificationPage itemId="sub-hautes-terres" />);
    expect(screen.queryByText('Lancer l’analyse')).toBeNull();
  });
});
