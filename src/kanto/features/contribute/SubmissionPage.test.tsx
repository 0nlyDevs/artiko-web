import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { SubmissionPage } from './SubmissionPage';

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

describe('SubmissionPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    window.history.replaceState(null, '', '/contribuer/sub-hautes-terres');
    await session.signIn(CONTRIBUTOR);
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('renders the Misaotra confirmation and the tracker of a pending submission', async () => {
    render(<SubmissionPage itemId="sub-hautes-terres" />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /Misaotra/ }),
    ).toBeTruthy();
    expect(
      screen.getByText('Bordereau de dépôt · N° KT-2026-0148'),
    ).toBeTruthy();
    const tracker = screen.getByRole('listitem', { current: 'step' });
    expect(tracker.textContent).toMatch(/En relecture/);
    expect(screen.getByText(/^Reçue/)).toBeTruthy();
    expect(screen.getByText(/^Accrochée dans la salle/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Visiter le musée' })).toBeTruthy();
  });

  it('shows a not-found block for an unknown deposit', async () => {
    render(<SubmissionPage itemId="nope" />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /introuvable/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Retour à mon espace' }),
    ).toBeTruthy();
  });

  it('offers to see the hanging again once the work is published', async () => {
    session.reset();
    await session.signIn({
      email: 'relecture@kanto.demo',
      password: 'kanto-demo-2026',
    });
    render(<SubmissionPage itemId="peinture-02" />);

    expect(
      await screen.findByRole('link', { name: 'Revoir l’accrochage' }),
    ).toHaveAttribute('href', '/contribuer/peinture-02/accrochage');
  });

  it('does not offer it for a work still in review, or to someone else', async () => {
    const { unmount } = render(<SubmissionPage itemId="sub-hautes-terres" />);
    await screen.findByRole('heading', { level: 1, name: /Misaotra/ });
    expect(screen.queryByRole('link', { name: 'Revoir l’accrochage' })).toBeNull();
    unmount();

    // A published work of the collection, opened by a contributor who does not own it.
    render(<SubmissionPage itemId="peinture-02" />);
    await screen.findByRole('link', { name: 'Voir dans le musée' });
    expect(screen.queryByRole('link', { name: 'Revoir l’accrochage' })).toBeNull();
  });
});
