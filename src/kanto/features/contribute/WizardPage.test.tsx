import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { api, resetDemoData } from '../../lib/api';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { session } from '../../lib/session/session';
import { settleMotion } from '../../test/motion';
import { WizardPage } from './WizardPage';

const CONTRIBUTOR = {
  email: 'visiteur@kanto.demo',
  password: 'kanto-demo-2026',
};

describe('WizardPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    window.history.replaceState(null, '', '/contribuer/nouvelle');
    await session.signIn(CONTRIBUTOR);
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('names the missing information when continuing with an empty step 1', async () => {
    render(<WizardPage itemId={null} step={1} />);

    fireEvent.click(
      await screen.findByRole('button', { name: /Continuer · Médias/ }),
    );

    expect(
      await screen.findByText(
        'Deux informations manquent avant de continuer : la forme d’art et le titre.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('creates the draft and moves to the media step once the art form and the title are set', async () => {
    render(<WizardPage itemId={null} step={1} />);

    fireEvent.click(await screen.findByLabelText(/Peinture/));
    fireEvent.change(screen.getByLabelText('Titre de l’œuvre'), {
      target: { value: 'Hautes Terres, fin du jour' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continuer · Médias/ }));

    await waitFor(
      () => {
        expect(window.location.pathname).toMatch(
          /^\/contribuer\/[^/]+\/etape\/2$/,
        );
      },
      { timeout: 3000 },
    );
  });

  describe('sending the work', () => {
    // A complete draft: the demo submission, taken back from the review.
    const DRAFT = 'sub-hautes-terres';

    beforeEach(async () => {
      await api.items.withdraw(DRAFT);
      window.history.replaceState(null, '', `/contribuer/${DRAFT}/etape/4`);
    });

    afterEach(() => {
      setForcedReducedMotion(null);
    });

    it('fades to gallery black, then opens the hanging ceremony in place of the wizard', async () => {
      const entries = window.history.length;
      render(<WizardPage itemId={DRAFT} step={4} />);

      fireEvent.click(
        await screen.findByRole('button', { name: /Envoyer en relecture/ }),
      );

      // The send succeeded: the fade is up and says so, the address has not moved yet.
      expect(
        await screen.findByText(
          'Œuvre envoyée. Ouverture de la galerie…',
          {},
          { timeout: 3000 },
        ),
      ).toHaveAttribute('role', 'status');
      expect(window.location.pathname).toBe(`/contribuer/${DRAFT}/etape/4`);
      expect((await api.items.get(DRAFT)).review.state).toBe('pending');

      await settleMotion();

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          `/contribuer/${DRAFT}/accrochage`,
        );
      });
      // Replaced, not pushed: "back" does not return to a sent step 4.
      expect(window.history.length).toBe(entries);
    });

    it('still reaches the ceremony with reduced motion', async () => {
      setForcedReducedMotion(true);
      render(<WizardPage itemId={DRAFT} step={4} />);

      fireEvent.click(
        await screen.findByRole('button', { name: /Envoyer en relecture/ }),
      );
      await screen.findByText(
        'Œuvre envoyée. Ouverture de la galerie…',
        {},
        { timeout: 3000 },
      );
      await settleMotion();

      await waitFor(() => {
        expect(window.location.pathname).toBe(
          `/contribuer/${DRAFT}/accrochage`,
        );
      });
    });

    it('stays on the wizard, without any fade, when the send is refused', async () => {
      // A draft with nothing in it: the review refuses it.
      window.history.replaceState(null, '', '/contribuer/sub-sinibe/etape/4');
      render(<WizardPage itemId="sub-sinibe" step={4} />);

      fireEvent.click(
        await screen.findByRole('button', { name: /Envoyer en relecture/ }),
      );

      expect(
        await screen.findByText(/La fiche est incomplète/, {}, { timeout: 3000 }),
      ).toBeTruthy();
      expect(
        screen.queryByText('Œuvre envoyée. Ouverture de la galerie…'),
      ).toBeNull();
      expect(window.location.pathname).toBe('/contribuer/sub-sinibe/etape/4');
    });
  });
});
